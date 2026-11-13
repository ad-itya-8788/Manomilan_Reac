<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdCardTemplate;
use App\Profile;
use App\ProfileMelavaRegistration;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class IdCardController extends Controller
{
    private const PREFERRED_ROW_SQL = 'profile_melava_registrations.id = (
        SELECT pmr_preferred.id
        FROM profile_melava_registrations AS pmr_preferred
        WHERE pmr_preferred.profile_id = profile_melava_registrations.profile_id
        ORDER BY (pmr_preferred.unique_id_number IS NOT NULL) DESC, pmr_preferred.id DESC
        LIMIT 1
    )';

    public function candidates(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        $filters = $this->validateCandidateFilters($request);
        $settings = $this->templateSettings();
        $query = $this->candidateQuery($filters, $settings);

        if ($request->boolean('ids_only')) {
            $ids = (clone $query)
                ->orderByDesc('profile_melava_registrations.created_at')
                ->orderByDesc('profile_melava_registrations.id')
                ->limit(5000)
                ->pluck('profile_melava_registrations.id')
                ->map(fn ($id) => (int) $id)
                ->values();

            return response()->json([
                'success' => true,
                'data' => $ids,
                'total' => $ids->count(),
            ]);
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        $page = (int) ($filters['page'] ?? 1);
        $stats = [
            'total' => (clone $query)->count(),
            'assigned' => (clone $query)->whereNotNull('profile_melava_registrations.unique_id_number')->count(),
            'unassigned' => (clone $query)->whereNull('profile_melava_registrations.unique_id_number')->count(),
        ];

        $registrations = $query
            ->orderByDesc('profile_melava_registrations.created_at')
            ->orderByDesc('profile_melava_registrations.id')
            ->paginate($perPage, ['*'], 'page', $page);
        $registrations->getCollection()->transform(
            fn (ProfileMelavaRegistration $registration) => $this->present($registration, $settings, $request)
        );

        return response()->json([
            'success' => true,
            'data' => $registrations,
            'stats' => $stats,
            'age_groups' => $settings['ageGroups'] ?? [],
        ]);
    }

    public function cards(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        $filters = $this->validateCandidateFilters($request);
        $settings = $this->templateSettings();
        $query = $this->candidateQuery($filters, $settings);

        $cards = $query
            ->orderBy('profile_melava_registrations.created_at')
            ->orderBy('profile_melava_registrations.id')
            ->limit(1000)
            ->get()
            ->map(fn (ProfileMelavaRegistration $registration) => $this->present($registration, $settings, $request))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $cards,
            'settings' => $settings,
            'count' => $cards->count(),
            'truncated' => $cards->count() >= 1000,
        ]);
    }

    public function previewAssignment(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        $data = $this->validateAssignment($request);
        $rows = $this->assignmentQuery($data['age_min'], $data['age_max'])
            ->orderBy('pmr.id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $this->buildAssignmentPreview($data['prefix'], $data['age_min'], $data['age_max'], $rows),
        ]);
    }

    public function assign(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        $data = $this->validateAssignment($request);
        $lockName = 'id_cards_assign_'.sha1($data['prefix']);
        $lockAcquired = false;
        try {
            $lock = DB::selectOne('SELECT GET_LOCK(?, 10) AS acquired', [$lockName]);
            if (! $lock || (int) $lock->acquired !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Another ID assignment is in progress. Please try again.',
                ], 409);
            }
            $lockAcquired = true;

            $result = DB::transaction(function () use ($data, $request) {
                $rows = $this->assignmentQuery($data['age_min'], $data['age_max'])
                    ->orderBy('pmr.id')
                    ->lockForUpdate()
                    ->get();

                $preview = $this->buildAssignmentPreview($data['prefix'], $data['age_min'], $data['age_max'], $rows);

                if ($preview['overwrite_count'] > 0 && ! $data['overwrite_existing']) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'overwrite_existing' => "{$preview['overwrite_count']} matching record(s) already have a different unique number. Confirm the overwrite and try again.",
                    ]);
                }

                $userId = $request->user()?->id;
                $updated = 0;
                $failed = 0;
                $updatingIds = [];
                $numbersById = [];

                foreach ($preview['candidates'] as $candidate) {
                    if (! $candidate['will_update']) {
                        continue;
                    }

                    $updatingIds[] = $candidate['id'];
                    $numbersById[$candidate['id']] = $candidate['proposed_unique_id_number'];
                }

                if ($updatingIds !== []) {
                    DB::table('profile_melava_registrations')
                        ->whereIn('id', $updatingIds)
                        ->update(['unique_id_number' => null]);
                }

                foreach ($numbersById as $id => $number) {
                    $affected = DB::table('profile_melava_registrations')
                        ->where('id', $id)
                        ->update([
                            'unique_id_number' => $number,
                            'updated_by_user_id' => $userId,
                            'updated_at' => now(),
                        ]);

                    if ($affected) {
                        $updated++;
                    } else {
                        $failed++;
                    }
                }

                return [
                    'prefix' => $preview['prefix'],
                    'age_min' => $preview['age_min'],
                    'age_max' => $preview['age_max'],
                    'matched_count' => $preview['total'],
                    'assigned_count' => $preview['total'],
                    'updated_count' => $updated,
                    'newly_assigned_count' => $preview['new_count'],
                    'overwritten_count' => $preview['overwrite_count'],
                    'unchanged_count' => $preview['unchanged_count'],
                    'failed_count' => $failed,
                ];
            }, 3);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (QueryException $exception) {
            return $this->operationFailed(
                $exception,
                'The unique numbers could not be saved because of a duplicate or database conflict. Please preview again and retry.',
                422
            );
        } catch (Throwable $exception) {
            return $this->operationFailed($exception, 'Unable to assign ID numbers. Please try again.');
        } finally {
            if ($lockAcquired) {
                try {
                    DB::select('SELECT RELEASE_LOCK(?)', [$lockName]);
                } catch (Throwable $exception) {
                    report($exception);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "{$result['updated_count']} record(s) updated. {$result['assigned_count']} matching candidate(s) now have unique numbers.",
            'data' => $result,
        ]);
    }

    public function showDesign(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        try {
            $template = IdCardTemplate::query()->where('slug', IdCardTemplate::DEFAULT_SLUG)->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'settings' => $this->mergeSettings($template?->settings ?? []),
                    'updated_at' => $template?->updated_at,
                ],
            ]);
        } catch (Throwable $exception) {
            return $this->operationFailed($exception, 'Unable to load the ID card design.');
        }
    }

    public function saveDesign(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        $request->validate(['settings' => ['required', 'array']]);
        $settings = $this->validatedSettings((array) $request->input('settings', []));

        try {
            $template = $this->persistDesignSettings($request, $settings);
        } catch (Throwable $exception) {
            return $this->operationFailed($exception, 'Unable to save the ID card design.');
        }

        return response()->json([
            'success' => true,
            'message' => 'ID card design saved.',
            'data' => [
                'settings' => $this->mergeSettings($template->settings ?? []),
                'updated_at' => $template->updated_at,
            ],
        ]);
    }

    public function resetDesign(Request $request)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        $settings = $this->defaultSettings();
        try {
            $template = $this->persistDesignSettings($request, $settings);
        } catch (Throwable $exception) {
            return $this->operationFailed($exception, 'Unable to reset the ID card design.');
        }

        return response()->json([
            'success' => true,
            'message' => 'ID card design reset to defaults.',
            'data' => ['settings' => $settings],
        ]);
    }

    public function photo(Request $request, int $profile)
    {
        if (! $this->isAdmin($request)) {
            return $this->forbidden();
        }

        try {
            $profileModel = Profile::query()->find($profile);
            if (! $profileModel) {
                return response()->json(['success' => false, 'message' => 'Profile not found.'], 404);
            }

            $file = $this->localUploadPath($this->profilePhotoPath($profileModel));
            if (! $file) {
                return response()->json(['success' => false, 'message' => 'Photo not found.'], 404);
            }

            $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file);
            if (! is_string($mime) || ! str_starts_with($mime, 'image/')) {
                return response()->json(['success' => false, 'message' => 'Photo not found.'], 404);
            }

            return response()->file($file, [
                'Content-Type' => $mime,
                'Cache-Control' => 'private, max-age=3600',
                'Access-Control-Allow-Origin' => '*',
            ]);
        } catch (Throwable $exception) {
            return $this->operationFailed($exception, 'Unable to load the candidate photo.');
        }
    }

    private function persistDesignSettings(Request $request, array $settings): IdCardTemplate
    {
        return DB::transaction(function () use ($request, $settings): IdCardTemplate {
            $template = IdCardTemplate::query()
                ->where('slug', IdCardTemplate::DEFAULT_SLUG)
                ->lockForUpdate()
                ->first();

            if (! $template) {
                $template = new IdCardTemplate([
                    'slug' => IdCardTemplate::DEFAULT_SLUG,
                    'created_by_user_id' => $request->user()?->id,
                ]);
            }

            $template->name = 'Default ID Card';
            $template->settings = $settings;
            $template->updated_by_user_id = $request->user()?->id;
            $template->save();

            return $template;
        }, 3);
    }

    private function operationFailed(Throwable $exception, string $message, int $status = 500)
    {
        report($exception);

        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status);
    }

    private function validateCandidateFilters(Request $request): array
    {
        return $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'unique_id' => ['nullable', 'string', 'max:50'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'gender' => ['nullable', Rule::in(['groom', 'bride'])],
            'age_group' => ['nullable', 'string', 'max:20'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'assigned' => ['nullable', Rule::in(['all', 'assigned', 'unassigned'])],
            'campaign_id' => ['nullable', 'integer', 'exists:melava_campaigns,id'],
            'ids' => ['nullable'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
    }

    private function validateAssignment(Request $request): array
    {
        $data = $request->validate([
            'prefix' => ['required', 'string', 'max:40'],
            'age_min' => ['required', 'integer', 'min:1', 'max:120'],
            'age_max' => ['required', 'integer', 'min:1', 'max:120'],
            'overwrite_existing' => ['nullable', 'boolean'],
        ]);

        $prefix = strtoupper(trim((string) $data['prefix']));
        $prefix = trim($prefix, '-');

        if ($prefix === '' || ! preg_match('/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/', $prefix)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'prefix' => 'Enter a valid code such as AA-02.',
            ]);
        }

        if ((int) $data['age_min'] > (int) $data['age_max']) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'age_max' => 'Maximum age must be greater than or equal to the minimum age.',
            ]);
        }

        return [
            'prefix' => $prefix,
            'age_min' => (int) $data['age_min'],
            'age_max' => (int) $data['age_max'],
            'overwrite_existing' => $request->boolean('overwrite_existing'),
        ];
    }

    private function candidateQuery(array $filters, array $settings)
    {
        $query = ProfileMelavaRegistration::query()
            ->with(['profile', 'campaign'])
            ->whereNotNull('profile_melava_registrations.profile_id')
            ->whereHas('profile')
            ->whereRaw(self::PREFERRED_ROW_SQL);

        $search = trim((string) ($filters['q'] ?? ''));
        if ($search !== '') {
            $query->where(function ($nested) use ($search): void {
                $nested->whereHas('profile', function ($profileQuery) use ($search): void {
                    $profileQuery->where('full_name', 'like', "%{$search}%")
                        ->orWhere('reg_id', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })->orWhere('unique_id_number', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['unique_id'])) {
            $query->where('unique_id_number', 'like', '%'.trim((string) $filters['unique_id']).'%');
        }

        if (! empty($filters['mobile'])) {
            $mobile = trim((string) $filters['mobile']);
            $query->whereHas('profile', fn ($profileQuery) => $profileQuery->where('phone', 'like', "%{$mobile}%"));
        }

        if (! empty($filters['gender'])) {
            $query->whereHas('profile', fn ($profileQuery) => $profileQuery
                ->whereRaw('LOWER(groomorbride) = ?', [$filters['gender']]));
        }

        $ageRange = $this->resolveAgeRange($settings, $filters['age_group'] ?? null);
        if ($ageRange) {
            $query->whereHas('profile', function ($profileQuery) use ($ageRange): void {
                $profileQuery->whereNotNull('birth_date')
                    ->whereRaw('TIMESTAMPDIFF(YEAR, profiles.birth_date, CURDATE()) BETWEEN ? AND ?', $ageRange);
            });
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('profile_melava_registrations.created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('profile_melava_registrations.created_at', '<=', $filters['date_to']);
        }

        if (($filters['assigned'] ?? 'all') === 'assigned') {
            $query->whereNotNull('profile_melava_registrations.unique_id_number');
        } elseif (($filters['assigned'] ?? 'all') === 'unassigned') {
            $query->whereNull('profile_melava_registrations.unique_id_number');
        }

        if (! empty($filters['campaign_id'])) {
            $query->where('melava_campaign_id', (int) $filters['campaign_id']);
        }

        $ids = $this->parseIds($filters['ids'] ?? null);
        if ($ids !== []) {
            $query->whereIn('profile_melava_registrations.id', $ids);
        }

        return $query;
    }

    private function assignmentQuery(int $ageMin, int $ageMax)
    {
        return DB::table('profile_melava_registrations as pmr')
            ->join('profiles as p', 'p.id', '=', 'pmr.profile_id')
            ->whereNotNull('p.birth_date')
            ->whereRaw('TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) BETWEEN ? AND ?', [$ageMin, $ageMax])
            ->select([
                'pmr.id',
                'pmr.profile_id',
                'pmr.unique_id_number',
                'p.full_name',
                'p.reg_id',
                'p.birth_date',
                DB::raw('TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) as calculated_age'),
            ]);
    }

    private function buildAssignmentPreview(string $prefix, int $ageMin, int $ageMax, $rows): array
    {
        $targetIds = $rows->pluck('id')->map(fn ($id) => (int) $id)->all();
        $reserved = $this->reservedSerials($prefix, $targetIds);

        $serial = 1;
        $newCount = 0;
        $overwriteCount = 0;
        $unchangedCount = 0;
        $candidates = [];

        foreach ($rows as $row) {
            while (isset($reserved[$serial])) {
                $serial++;
            }

            $number = $this->formatAssignmentNumber($prefix, $serial);
            $current = $row->unique_id_number !== null ? (string) $row->unique_id_number : null;
            $changed = $current !== $number;
            $overwrite = $current !== null && $changed;

            if ($current === null) {
                $newCount++;
            } elseif ($changed) {
                $overwriteCount++;
            } else {
                $unchangedCount++;
            }

            $candidates[] = [
                'id' => (int) $row->id,
                'profile_id' => (int) $row->profile_id,
                'full_name' => $row->full_name,
                'registration_number' => $row->reg_id,
                'age' => (int) $row->calculated_age,
                'birth_date' => $row->birth_date,
                'current_unique_id_number' => $current,
                'proposed_unique_id_number' => $number,
                'will_update' => $changed,
                'will_overwrite' => $overwrite,
            ];

            $serial++;
        }

        $total = count($candidates);

        return [
            'prefix' => $prefix,
            'age_min' => $ageMin,
            'age_max' => $ageMax,
            'total' => $total,
            'currently_assigned' => $overwriteCount + $unchangedCount,
            'new_count' => $newCount,
            'overwrite_count' => $overwriteCount,
            'unchanged_count' => $unchangedCount,
            'updated_count' => $newCount + $overwriteCount,
            'format' => $candidates[0]['proposed_unique_id_number'] ?? $this->formatAssignmentNumber($prefix, 1),
            'first_number' => $candidates[0]['proposed_unique_id_number'] ?? null,
            'last_number' => $candidates[$total - 1]['proposed_unique_id_number'] ?? null,
            'candidates' => $candidates,
        ];
    }

    private function reservedSerials(string $prefix, array $targetIds): array
    {
        $query = DB::table('profile_melava_registrations')
            ->whereNotNull('unique_id_number')
            ->where('unique_id_number', 'like', $prefix.'-%');

        if ($targetIds !== []) {
            $query->whereNotIn('id', $targetIds);
        }

        $values = $query->pluck('unique_id_number');
        $regex = '/^'.preg_quote($prefix.'-', '/').'([0-9]+)$/i';
        $serials = [];

        foreach ($values as $value) {
            if (preg_match($regex, (string) $value, $matches)) {
                $serials[(int) $matches[1]] = true;
            }
        }

        return $serials;
    }

    private function formatAssignmentNumber(string $prefix, int $serial): string
    {
        return $prefix.'-'.str_pad((string) $serial, 3, '0', STR_PAD_LEFT);
    }

    private function present(ProfileMelavaRegistration $registration, array $settings, Request $request): array
    {
        $registration->loadMissing(['profile', 'campaign']);
        $profile = $registration->profile;
        $birthDate = $profile?->birth_date;
        $age = $birthDate ? Carbon::parse($birthDate)->age : null;
        $group = $this->ageGroupFor($age, $settings);
        $photoPath = $this->profilePhotoPath($profile);
        $photoFile = $photoPath ? $this->localUploadPath($photoPath) : null;

        return [
            'id' => (int) $registration->id,
            'profile_id' => (int) $registration->profile_id,
            'full_name' => $profile?->full_name,
            'registration_number' => $profile?->reg_id,
            'unique_id_number' => $registration->unique_id_number,
            'assigned' => $registration->unique_id_number !== null,
            'age' => $age,
            'age_group' => $group['code'] ?? null,
            'age_group_label' => $group['label'] ?? null,
            'gender' => $profile?->groomorbride,
            'mobile' => $profile?->phone,
            'email' => $profile?->email,
            'birth_date' => $birthDate ? Carbon::parse($birthDate)->format('Y-m-d') : null,
            'registration_date' => $registration->created_at?->format(DATE_ATOM),
            'city' => data_get($profile?->addresses, 'current.city'),
            'campaign_code' => $registration->campaign?->melava_code,
            'campaign_title' => $registration->campaign?->title,
            'photo_url' => $photoPath ? $this->fileUrl($photoPath) : '',
            'photo_proxy_path' => $photoFile ? '/id-cards/photo/'.$registration->profile_id : '',
            'photo_proxy_url' => $photoFile
                ? rtrim($request->getSchemeAndHttpHost(), '/').'/api/id-cards/photo/'.$registration->profile_id
                : '',
        ];
    }

    private function ageGroupFor(?int $age, array $settings): ?array
    {
        if ($age === null) {
            return null;
        }

        foreach ($settings['ageGroups'] ?? [] as $group) {
            if ($age >= (int) $group['min'] && $age <= (int) $group['max']) {
                return $group;
            }
        }

        return null;
    }

    private function resolveAgeRange(array $settings, ?string $code): ?array
    {
        $code = trim((string) $code);
        if ($code === '') {
            return null;
        }

        foreach ($settings['ageGroups'] ?? [] as $group) {
            if (strcasecmp((string) $group['code'], $code) === 0) {
                return [(int) $group['min'], (int) $group['max']];
            }
        }

        throw \Illuminate\Validation\ValidationException::withMessages([
            'age_group' => 'The selected age group is not configured in the ID card design.',
        ]);
    }

    private function parseIds(mixed $value): array
    {
        if (is_string($value)) {
            $value = array_filter(array_map('trim', explode(',', $value)), fn ($id) => $id !== '');
        }

        if (! is_array($value)) {
            return [];
        }

        return collect($value)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function templateSettings(): array
    {
        $template = IdCardTemplate::query()->where('slug', IdCardTemplate::DEFAULT_SLUG)->first();

        return $this->mergeSettings($template?->settings ?? []);
    }

    private function mergeSettings(array $settings): array
    {
        $defaults = $this->defaultSettings();
        $merged = array_merge($defaults, array_intersect_key($settings, $defaults));
        $merged['fieldPositions'] = $defaults['fieldPositions'];

        if (is_array($settings['fieldPositions'] ?? null)) {
            foreach ($defaults['fieldPositions'] as $key => $position) {
                if (is_array($settings['fieldPositions'][$key] ?? null)) {
                    $merged['fieldPositions'][$key] = array_merge(
                        $position,
                        array_intersect_key($settings['fieldPositions'][$key], $position)
                    );
                }
            }
        }

        foreach (array_keys($defaults) as $key) {
            if (str_starts_with($key, 'show') && ! array_key_exists($key, $settings)) {
                $merged[$key] = $defaults[$key];
            }
        }

        if (empty($merged['ageGroups']) || ! is_array($merged['ageGroups'])) {
            $merged['ageGroups'] = $defaults['ageGroups'];
        }

        return $merged;
    }

    private function validatedSettings(array $input): array
    {
        $positionKeys = implode(',', array_keys($this->defaultSettings()['fieldPositions']));
        $elementSizeKeys = 'branding,photo,name,uniqueId,dob,ageGroup,gender,registrationNumber,mobile,city,campaign,customText,footer';
        $textStyleKeys = 'branding,cardBadge,name,uniqueId,dob,ageGroup,gender,registrationNumber,mobile,city,campaign,customText,footer';
        Validator::make($input, [
            'fieldPositions' => ['sometimes', "array:{$positionKeys}"],
            'fieldPositions.*' => ['sometimes', 'array:x,y'],
            'fieldPositions.*.x' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'fieldPositions.*.y' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'elementSizes' => ['sometimes', "array:{$elementSizeKeys}"],
            'elementSizes.*' => ['required', 'array:width,height'],
            'elementSizes.*.width' => ['required', 'numeric', 'min:3', 'max:100'],
            'elementSizes.*.height' => ['required', 'numeric', 'min:3', 'max:100'],
            'textStyles' => ['sometimes', "array:{$textStyleKeys}"],
            'textStyles.*' => ['sometimes', 'array:bold,italic,underline,fontScale,color,backgroundColor,align,showIcon,showLabel'],
            'textStyles.*.bold' => ['sometimes', 'boolean'],
            'textStyles.*.italic' => ['sometimes', 'boolean'],
            'textStyles.*.underline' => ['sometimes', 'boolean'],
            'textStyles.*.showIcon' => ['sometimes', 'boolean'],
            'textStyles.*.showLabel' => ['sometimes', 'boolean'],
            'textStyles.*.fontScale' => ['sometimes', 'numeric', 'min:0.1', 'max:100'],
            'textStyles.*.color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'textStyles.*.backgroundColor' => ['sometimes', 'regex:/^(transparent|#[0-9a-fA-F]{6})$/'],
            'textStyles.*.align' => ['sometimes', Rule::in(['left', 'center', 'right'])],
        ])->validate();

        $settings = $this->mergeSettings($input);

        $validator = Validator::make($settings, [
            'cardWidth' => ['required', 'numeric', 'min:1', 'max:1000'],
            'cardHeight' => ['required', 'numeric', 'min:1', 'max:1000'],
            'orientation' => ['required', Rule::in(['portrait', 'landscape'])],
            'bgColor' => ['required', 'regex:/^(transparent|#[0-9a-fA-F]{6})$/'],
            'borderColor' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'fontFamily' => ['required', 'string', 'max:100'],
            'fontSize' => ['required', 'numeric', 'min:6', 'max:40'],
            'textColor' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'photoWidth' => ['required', 'numeric', 'min:1', 'max:1000'],
            'photoHeight' => ['required', 'numeric', 'min:1', 'max:1000'],
            'photoPosition' => ['required', Rule::in(['left', 'right', 'top'])],
            'logoPosition' => ['required', Rule::in(['top-left', 'top-center', 'top-right', 'none'])],
            'align' => ['required', Rule::in(['left', 'center', 'right'])],
            'padding' => ['required', 'numeric', 'min:0', 'max:20'],
            'spacing' => ['required', 'numeric', 'min:0', 'max:20'],
            'customText' => ['nullable', 'string', 'max:200'],
            'footerText' => ['nullable', 'string', 'max:80'],
            'showFooter' => ['required', 'boolean'],
            'showFooterQr' => ['required', 'boolean'],
            'showFooterHearts' => ['required', 'boolean'],
            'customTextPosition' => ['required', Rule::in(['top', 'bottom'])],
            'fieldPositions' => ['required', 'array'],
            'fieldPositions.*' => ['required', 'array'],
            'fieldPositions.*.x' => ['required', 'numeric', 'min:0', 'max:100'],
            'fieldPositions.*.y' => ['required', 'numeric', 'min:0', 'max:100'],
            'elementSizes' => ['present', 'array'],
            'elementSizes.*' => ['required', 'array:width,height'],
            'elementSizes.*.width' => ['required', 'numeric', 'min:3', 'max:100'],
            'elementSizes.*.height' => ['required', 'numeric', 'min:3', 'max:100'],
            'textStyles' => ['present', 'array'],
            'textStyles.*' => ['sometimes', 'array:bold,italic,underline,fontScale,color,backgroundColor,align,showIcon,showLabel'],
            'textStyles.*.bold' => ['sometimes', 'boolean'],
            'textStyles.*.italic' => ['sometimes', 'boolean'],
            'textStyles.*.underline' => ['sometimes', 'boolean'],
            'textStyles.*.showIcon' => ['sometimes', 'boolean'],
            'textStyles.*.showLabel' => ['sometimes', 'boolean'],
            'textStyles.*.fontScale' => ['sometimes', 'numeric', 'min:0.1', 'max:100'],
            'textStyles.*.color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'textStyles.*.backgroundColor' => ['sometimes', 'regex:/^(transparent|#[0-9a-fA-F]{6})$/'],
            'textStyles.*.align' => ['sometimes', Rule::in(['left', 'center', 'right'])],
            'ageGroups' => ['array', 'max:20'],
            'ageGroups.*.code' => ['required', 'string', 'max:10', 'regex:/^[A-Za-z0-9-]+$/'],
            'ageGroups.*.label' => ['nullable', 'string', 'max:30'],
            'ageGroups.*.min' => ['required', 'integer', 'min:1', 'max:120'],
            'ageGroups.*.max' => ['required', 'integer', 'min:1', 'max:120'],
        ]);

        $validator->after(function ($validator) use ($settings): void {
            $codes = [];
            foreach ($settings['ageGroups'] ?? [] as $index => $group) {
                if ((int) $group['min'] > (int) $group['max']) {
                    $validator->errors()->add("ageGroups.{$index}.max", 'Maximum age must be greater than or equal to the minimum age.');
                }
                $code = strtoupper((string) $group['code']);
                if (isset($codes[$code])) {
                    $validator->errors()->add("ageGroups.{$index}.code", 'Age group codes must be unique.');
                }
                $codes[$code] = true;
            }
        });

        $validator->validate();

        $settings['cardWidth'] = (float) $settings['cardWidth'];
        $settings['cardHeight'] = (float) $settings['cardHeight'];
        $settings['fontSize'] = (float) $settings['fontSize'];
        $settings['photoWidth'] = (float) $settings['photoWidth'];
        $settings['photoHeight'] = (float) $settings['photoHeight'];
        $settings['padding'] = (float) $settings['padding'];
        $settings['spacing'] = (float) $settings['spacing'];
        foreach ($settings['fieldPositions'] as $key => $position) {
            $settings['fieldPositions'][$key] = [
                'x' => (float) $position['x'],
                'y' => (float) $position['y'],
            ];
        }
        foreach ($settings['elementSizes'] as $key => $size) {
            $settings['elementSizes'][$key] = [
                'width' => (float) $size['width'],
                'height' => (float) $size['height'],
            ];
        }
        foreach ($settings['textStyles'] as $key => $style) {
            foreach (['bold', 'italic', 'underline', 'showIcon', 'showLabel'] as $booleanKey) {
                if (array_key_exists($booleanKey, $style)) {
                    $settings['textStyles'][$key][$booleanKey] = (bool) $style[$booleanKey];
                }
            }
            if (array_key_exists('fontScale', $style)) {
                $settings['textStyles'][$key]['fontScale'] = (float) $style['fontScale'];
            }
        }
        foreach ($settings as $key => $value) {
            if (str_starts_with($key, 'show')) {
                $settings[$key] = (bool) $value;
            }
        }
        $settings['ageGroups'] = array_values(array_map(fn ($group) => [
            'code' => strtoupper(trim((string) $group['code'])),
            'label' => trim((string) ($group['label'] ?? '')),
            'min' => (int) $group['min'],
            'max' => (int) $group['max'],
        ], $settings['ageGroups'] ?? []));

        return $settings;
    }

    private function defaultSettings(): array
    {
        return [
            'version' => 2,
            'cardWidth' => 100,
            'cardHeight' => 65,
            'orientation' => 'landscape',
            'bgColor' => '#ffffff',
            'borderColor' => '#187f78',
            'fontFamily' => 'Poppins, Arial, sans-serif',
            'fontSize' => 11,
            'textColor' => '#17212b',
            'photoWidth' => 25,
            'photoHeight' => 30,
            'photoPosition' => 'left',
            'logoPosition' => 'top-left',
            'align' => 'left',
            'padding' => 5,
            'spacing' => 2.5,
            'customText' => '',
            'footerText' => 'Scan to View Profile',
            'customTextPosition' => 'bottom',
            'showBranding' => true,
            'showCustomText' => true,
            'showFooter' => true,
            'showFooterQr' => true,
            'showFooterHearts' => true,
            'showName' => true,
            'showUniqueId' => true,
            'showPhoto' => true,
            'showMobile' => true,
            'showDob' => true,
            'showAgeGroup' => true,
            'showGender' => true,
            'showRegistrationNumber' => true,
            'showCity' => false,
            'showCampaign' => false,
            'elementSizes' => [],
            'textStyles' => [],
            'fieldPositions' => [
                'branding' => ['x' => 3, 'y' => 2],
                'photo' => ['x' => 2, 'y' => 25],
                'name' => ['x' => 31, 'y' => 20],
                'uniqueId' => ['x' => 31, 'y' => 36],
                'mobile' => ['x' => 31, 'y' => 54],
                'dob' => ['x' => 66, 'y' => 54],
                'ageGroup' => ['x' => 31, 'y' => 70],
                'gender' => ['x' => 66, 'y' => 70],
                'registrationNumber' => ['x' => 31, 'y' => 84],
                'city' => ['x' => 2, 'y' => 84],
                'campaign' => ['x' => 66, 'y' => 84],
                'customText' => ['x' => 2, 'y' => 93],
                'footer' => ['x' => 0, 'y' => 86],
            ],
            'ageGroups' => [
                ['code' => '01', 'label' => '18-25', 'min' => 18, 'max' => 25],
                ['code' => '02', 'label' => '26-30', 'min' => 26, 'max' => 30],
                ['code' => '03', 'label' => '31-35', 'min' => 31, 'max' => 35],
                ['code' => '04', 'label' => '36-40', 'min' => 36, 'max' => 40],
                ['code' => '05', 'label' => '41-50', 'min' => 41, 'max' => 50],
                ['code' => '06', 'label' => '51-120', 'min' => 51, 'max' => 120],
            ],
        ];
    }

    private function profilePhotoPath(?Profile $profile): ?string
    {
        if (! $profile) {
            return null;
        }

        $photo = $profile->photoPath('profile_photo');
        $photo = $profile->profilePhotoWithFallback($photo);

        return is_string($photo) && trim($photo) !== '' ? trim($photo) : null;
    }

    private function fileUrl(?string $path): string
    {
        if (! $path) {
            return '';
        }
        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        $path = ltrim(preg_replace('#^/?storage/#', '', $path), '/');
        if (str_starts_with($path, 'uploads/profile_photos/')
            || str_starts_with($path, 'uploads/payment_screenshots/')) {
            $path = substr($path, strlen('uploads/'));
        }

        return Storage::disk('public')->url($path);
    }

    private function localUploadPath(?string $path): ?string
    {
        if (! is_string($path)) {
            return null;
        }

        $path = rawurldecode(ltrim(str_replace('\\', '/', trim($path)), '/'));
        if ($path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            $path = ltrim((string) parse_url($path, PHP_URL_PATH), '/');
        }

        foreach (['storage/app/public/', 'storage/', 'public/'] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $path = substr($path, strlen($prefix));
                break;
            }
        }

        $segments = explode('/', $path);
        if (in_array('..', $segments, true)) {
            return null;
        }

        $relativePaths = [$path];
        foreach ([
            'uploads/profile_photos/',
            'uploads/melava_documents/',
            'uploads/melava_birth_docs/',
            'uploads/melava_candidate_photos/',
            'uploads/melava_additional_photos/',
        ] as $legacyPrefix) {
            if (str_starts_with($path, $legacyPrefix)) {
                $relativePaths[] = substr($path, strlen('uploads/'));
            }
        }

        foreach (array_unique($relativePaths) as $relativePath) {
            foreach ([public_path($relativePath), storage_path('app/public/'.$relativePath)] as $candidate) {
                $file = realpath($candidate);
                if ($file && is_file($file)) {
                    return $file;
                }
            }
        }

        return null;
    }

    private function isAdmin(Request $request): bool
    {
        return $request->user()?->portal() === 'admin';
    }

    private function forbidden()
    {
        return response()->json(['success' => false, 'message' => 'Administrator access is required.'], 403);
    }
}
