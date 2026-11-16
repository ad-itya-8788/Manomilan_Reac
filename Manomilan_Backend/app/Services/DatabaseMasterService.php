<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use App\Profile;
use App\Support\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DatabaseMasterService
{
    private const SENSITIVE_COLUMN_PATTERN = '/password|remember_token|token|secret|api_key|private_key|hash/i';
    private const READ_ONLY_RELATED_COLUMN_PATTERN = '/(?:^id$|_id$|_at$|password|remember_token|token|secret|api_key|private_key|hash|photo|image|file|path|document|proof|screenshot|attachment|aadhaar|pan_card|passport|birth_certificate|education_certificate|profession_proof|income_proof|caste_certificate|medical_fitness_certificate|registration_data|payment_details|^data$)/i';

    private readonly array $editableProfileColumns;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
        $this->editableProfileColumns = [
            'full_name',
            'email',
            'phone',
            'birth_date',
            'birth_time',
            'birth_place',
            'groomorbride',
            'marital_status',
            'height_cm',
            'weight_kg',
            'blood_group',
            'mother_tongue',
            'about_me',
            'special_cases',
            'monthly_income',
            'annual_income',
            'verification_status',
            'status',
            'profile_photo',
            'full_body_photo',
            'half_body_photo',
            'selfie_photo',
        ];
    }

    public function searchCandidates(string $term, int $perPage): LengthAwarePaginator
    {
        $term = trim($term);
        $like = '%' . $term . '%';
        $profileColumns = Schema::getColumnListing('profiles');
        $searchable = array_values(array_intersect(
            ['full_name', 'reg_id', 'phone', 'email', 'registration_number', 'serial_no'],
            $profileColumns
        ));

        $query = Profile::query()
            ->select(['profiles.id']);
        foreach (['full_name', 'reg_id', 'phone', 'email', 'groomorbride', 'status', 'verification_status', 'created_at'] as $column) {
            if (in_array($column, $profileColumns, true)) {
                $query->addSelect('profiles.' . $column);
            }
        }

        $query->with([
            'user:id,profile_id,name,email,username,status',
            'profileMelavaRegistrations:id,profile_id,unique_id_number',
        ]);

        $query->where(function ($search) use ($term, $like, $searchable): void {
            foreach ($searchable as $index => $column) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $search->{$method}($column, 'like', $like);
            }

            if (ctype_digit($term)) {
                $search->orWhere('profiles.id', (int) $term);
            }

            $search->orWhereHas('user', function ($user) use ($like): void {
                $user->where('name', 'like', $like)
                    ->orWhere('username', 'like', $like)
                    ->orWhere('email', 'like', $like);
            });

            if (Schema::hasTable('profile_melava_registrations')
                && Schema::hasColumn('profile_melava_registrations', 'unique_id_number')) {
                $search->orWhereExists(function ($exists) use ($like): void {
                    $exists->select(DB::raw(1))
                        ->from('profile_melava_registrations')
                        ->whereColumn('profile_melava_registrations.profile_id', 'profiles.id')
                        ->where('profile_melava_registrations.unique_id_number', 'like', $like);
                });
            }
        });

        return $query
            ->orderByDesc('profiles.id')
            ->paginate($perPage)
            ->through(function (Profile $profile): array {
                $uniqueId = $profile->profileMelavaRegistrations
                    ->pluck('unique_id_number')
                    ->filter()
                    ->first();

                return [
                    'id' => $profile->id,
                    'full_name' => $profile->full_name,
                    'reg_id' => $profile->reg_id,
                    'unique_id_number' => $uniqueId,
                    'email' => $profile->email,
                    'phone' => $profile->phone,
                    'groomorbride' => $profile->groomorbride,
                    'status' => $profile->status,
                    'verification_status' => $profile->verification_status,
                    'created_at' => $profile->created_at,
                    'account' => $profile->user ? [
                        'id' => $profile->user->id,
                        'name' => $profile->user->name,
                        'username' => $profile->user->username,
                        'email' => $profile->user->email,
                        'status' => $profile->user->status,
                    ] : null,
                ];
            });
    }

    public function candidateOverview(int $profileId): array
    {
        $profile = Profile::query()
            ->with('user:id,profile_id,name,email,username,status')
            ->findOrFail($profileId);

        $accounts = User::query()
            ->where('profile_id', $profileId)
            ->with('role:id,name,user_type,is_active')
            ->get()
            ->map(fn (User $user): array => $this->safeUser($user))
            ->values()
            ->all();

        return [
            'profile' => $this->safeRow($profile->toArray()),
            'accounts' => $accounts,
            'deletion_plan' => $this->deletionPlan($profileId),
        ];
    }

    public function relatedRecords(int $profileId, string $table, int $perPage): array
    {
        $relation = $this->relationDefinition($table);
        if ($relation === null) {
            throw ValidationException::withMessages([
                'table' => 'This table is not configured as a candidate-related table.',
            ]);
        }

        Profile::query()->findOrFail($profileId);
        $userIds = $this->candidateUserIds($profileId);
        $columns = Schema::getColumnListing($table);
        $query = DB::table($table);
        $this->applyRelationScope($query, $relation, $profileId, $userIds);

        $orderColumn = in_array('id', $columns, true) ? 'id' : ($columns[0] ?? null);
        if ($orderColumn !== null) {
            $query->orderByDesc($orderColumn);
        }

        $records = $query
            ->paginate($perPage)
            ->through(fn ($row): array => $this->safeRow((array) $row));

        return [
            'table' => $table,
            'label' => $relation['label'],
            'strategy' => $relation['strategy'],
            'columns' => $columns,
            'editable_columns' => $relation['strategy'] === 'read_only'
                ? []
                : $this->editableRelatedColumns($table),
            'records' => $records,
        ];
    }

    public function updateRelatedRecord(
        int $profileId,
        string $table,
        int $recordId,
        array $values,
        ?User $actor
    ): array {
        $relation = $this->relationDefinition($table);
        if ($relation === null || $relation['strategy'] === 'read_only' || ! Schema::hasColumn($table, 'id')) {
            throw ValidationException::withMessages([
                'table' => 'This related table does not support record editing.',
            ]);
        }

        $editableColumns = collect($this->editableRelatedColumns($table))
            ->keyBy('name');
        $unknownColumns = array_diff(array_keys($values), $editableColumns->keys()->all());
        if ($unknownColumns !== []) {
            throw ValidationException::withMessages([
                'values' => 'One or more fields cannot be edited from Database Master.',
            ]);
        }

        $columnsByName = $editableColumns->all();
        $rules = [];
        foreach ($values as $name => $value) {
            $column = $columnsByName[$name];
            if ($value !== null && ! is_scalar($value)) {
                throw ValidationException::withMessages([
                    "values.{$name}" => 'This field must contain a single value.',
                ]);
            }
            if ($value === null && ! $column['nullable']) {
                throw ValidationException::withMessages([
                    "values.{$name}" => 'This field cannot be empty.',
                ]);
            }

            $type = $column['type'];
            $rules["values.{$name}"] = array_merge(
                $column['nullable'] ? ['nullable'] : ['required'],
                match ($type) {
                    'boolean' => ['boolean'],
                    'integer' => ['integer'],
                    'number' => ['numeric'],
                    'date' => ['date'],
                    'json' => ['json'],
                    default => ['string', 'max:5000'],
                }
            );
        }

        $validated = Validator::make(['values' => $values], $rules)->validate()['values'];
        $profile = Profile::query()->findOrFail($profileId);
        $userIds = $this->candidateUserIds($profileId);

        $scopedQuery = function () use ($table, $recordId, $relation, $profileId, $userIds) {
            $query = DB::table($table)->where('id', $recordId);
            $this->applyRelationScope($query, $relation, $profileId, $userIds);

            return $query;
        };

        return DB::transaction(function () use (
            $scopedQuery,
            $table,
            $recordId,
            $profileId,
            $profile,
            $actor,
            $validated
        ): array {
            $existing = $scopedQuery()->lockForUpdate()->first();
            if ($existing === null) {
                throw (new ModelNotFoundException())->setModel($table, [$recordId]);
            }

            $oldValues = array_intersect_key((array) $existing, $validated);
            $updates = $validated;
            if (Schema::hasColumn($table, 'updated_at')) {
                $updates['updated_at'] = now();
            }
            $scopedQuery()->update($updates);

            $this->auditLogger->log(
                $actor,
                'database_master.related_record_updated',
                'system_configuration',
                $table,
                $recordId,
                $profileId,
                $oldValues,
                $validated,
                sprintf(
                    'Updated related record %s for candidate %s from Database Master.',
                    $recordId,
                    $profile->full_name ?: $profileId
                )
            );

            return ['record' => $this->safeRow((array) $scopedQuery()->first())];
        });
    }

    public function deleteRelatedRecord(
        int $profileId,
        string $table,
        int $recordId,
        ?User $actor
    ): array {
        $relation = $this->relationDefinition($table);
        if ($relation === null || $relation['strategy'] === 'read_only' || ! Schema::hasColumn($table, 'id')) {
            throw ValidationException::withMessages([
                'table' => 'This related table does not support record deletion.',
            ]);
        }

        Profile::query()->findOrFail($profileId);
        $userIds = $this->candidateUserIds($profileId);
        $scopedQuery = function () use ($table, $recordId, $relation, $profileId, $userIds) {
            $query = DB::table($table)->where('id', $recordId);
            $this->applyRelationScope($query, $relation, $profileId, $userIds);

            return $query;
        };

        return DB::transaction(function () use (
            $scopedQuery,
            $table,
            $recordId,
            $profileId,
            $actor
        ): array {
            $existing = $scopedQuery()->lockForUpdate()->first();
            if ($existing === null) {
                throw (new ModelNotFoundException())->setModel($table, [$recordId]);
            }

            $oldValues = $this->safeRow((array) $existing);
            if ($scopedQuery()->delete() !== 1) {
                throw ValidationException::withMessages([
                    'record' => 'The related record could not be deleted.',
                ]);
            }

            $this->auditLogger->log(
                $actor,
                'database_master.related_record_deleted',
                'system_configuration',
                $table,
                $recordId,
                $profileId,
                $oldValues,
                ['deleted' => true],
                sprintf('Deleted related record %s from %s for candidate %s.', $recordId, $table, $profileId)
            );

            return ['record_id' => $recordId, 'deleted' => true];
        });
    }

    public function listTables(): array
    {
        $tables = collect(Schema::getTableListing())
            ->sort()
            ->values()
            ->map(function (string $table): array {
                $columns = Schema::getColumnListing($table);

                return [
                    'name' => $table,
                    'column_count' => count($columns),
                    'columns' => $columns,
                ];
            })
            ->all();

        return ['tables' => $tables];
    }

    public function browseTable(string $table, ?string $term, int $perPage): array
    {
        $table = trim($table);
        if ($table === '' || ! in_array($table, Schema::getTableListing(), true)) {
            throw ValidationException::withMessages([
                'table' => 'Unknown database table.',
            ]);
        }

        $metadata = Schema::getColumns($table);
        $columns = array_map(fn (array $column): array => [
            'name' => $column['name'],
            'type' => $column['type_name'] ?? $column['type'] ?? 'unknown',
            'nullable' => (bool) ($column['nullable'] ?? true),
            'sensitive' => $this->isSensitiveColumn($column['name']),
        ], $metadata);
        $columnNames = array_column($columns, 'name');

        $query = DB::table($table);
        $hasIdColumn = in_array('id', $columnNames, true);
        $term = trim((string) $term);
        if ($term !== '') {
            $like = '%' . $term . '%';
            $searchColumns = collect($columns)
                ->filter(fn (array $column): bool => ! $column['sensitive'])
                ->filter(fn (array $column): bool => preg_match('/char|text|string|enum|json|varchar/i', (string) $column['type']) === 1)
                ->take(6)
                ->pluck('name')
                ->all();

            $query->where(function ($search) use ($term, $like, $searchColumns, $hasIdColumn): void {
                foreach ($searchColumns as $index => $column) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $search->{$method}($column, 'like', $like);
                }

                if (ctype_digit($term) && $hasIdColumn) {
                    $search->orWhere('id', (int) $term);
                }
            });
        }

        $orderColumn = in_array('id', $columnNames, true) ? 'id' : ($columnNames[0] ?? null);
        if ($orderColumn !== null) {
            $query->orderByDesc($orderColumn);
        }

        return [
            'table' => $table,
            'columns' => $columns,
            'records' => $query
                ->paginate($perPage)
                ->through(fn ($row): array => $this->safeRow((array) $row)),
        ];
    }

    public function updateProfile(int $profileId, array $values, ?User $actor): array
    {
        $existing = Profile::query()->findOrFail($profileId);
        $profileColumns = Schema::getColumnListing('profiles');
        $allowed = array_values(array_intersect($this->editableProfileColumns, $profileColumns));
        $changes = array_intersect_key($values, array_flip($allowed));

        if ($changes === []) {
            throw ValidationException::withMessages([
                'values' => 'No editable profile fields were supplied.',
            ]);
        }

        $oldValues = [];
        foreach (array_keys($changes) as $column) {
            $oldValues[$column] = $existing->getAttribute($column);
        }

        $updates = $changes;
        if (in_array('updated_by_user_id', $profileColumns, true) && $actor) {
            $updates['updated_by_user_id'] = $actor->id;
        }
        if (in_array('updated_at', $profileColumns, true)) {
            $updates['updated_at'] = now();
        }

        DB::transaction(function () use ($profileId, $updates, $oldValues, $changes, $actor): void {
            DB::table('profiles')->where('id', $profileId)->update($updates);
            $this->auditLogger->log(
                $actor,
                'database_master.record_updated',
                'system_configuration',
                'profiles',
                $profileId,
                $profileId,
                $oldValues,
                $changes,
                'Updated candidate profile fields from Database Master.'
            );
        });

        $fresh = Profile::query()->findOrFail($profileId);

        return ['profile' => $this->safeRow($fresh->toArray())];
    }

    public function changePassword(int $profileId, string $password, ?User $actor): int
    {
        Profile::query()->findOrFail($profileId);
        $users = User::query()
            ->where('profile_id', $profileId)
            ->with('role:id,name,user_type,is_active')
            ->get();

        if ($users->isEmpty()) {
            throw ValidationException::withMessages([
                'password' => 'No user account is linked to this candidate.',
            ]);
        }

        if ($users->contains(fn (User $user): bool => $user->isSuperAdmin())) {
            throw ValidationException::withMessages([
                'password' => 'A privileged account is linked to this candidate. Password changes are blocked here.',
            ]);
        }

        $candidateUsers = $users->filter(fn (User $user): bool => $user->portal() === 'candidate')->values();
        if ($candidateUsers->isEmpty()) {
            throw ValidationException::withMessages([
                'password' => 'No candidate account is linked to this profile.',
            ]);
        }

        $userIds = $candidateUsers->pluck('id')->map(fn ($id): int => (int) $id)->all();

        DB::transaction(function () use ($candidateUsers, $userIds, $password, $actor, $profileId): void {
            foreach ($candidateUsers as $user) {
                $user->password = Hash::make($password);
                $user->is_password_changed = true;
                $user->save();
            }

            if (Schema::hasTable('api_token_sessions')) {
                DB::table('api_token_sessions')->whereIn('user_id', $userIds)->delete();
            }
            if (Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', User::class)
                    ->whereIn('tokenable_id', $userIds)
                    ->delete();
            }

            $this->auditLogger->log(
                $actor,
                'database_master.password_changed',
                'system_configuration',
                'users',
                $candidateUsers->first()->id,
                $profileId,
                [],
                ['user_ids' => $userIds, 'password_changed' => true],
                'Candidate password changed from Database Master. The password value was not recorded.'
            );
        });

        return count($userIds);
    }

    public function deletionPlan(int $profileId): array
    {
        $profile = Profile::query()->findOrFail($profileId);
        $users = User::query()
            ->where('profile_id', $profileId)
            ->with('role:id,name,user_type,is_active')
            ->get();
        $userIds = $users->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $items = [];
        $blockingMessages = [];

        foreach ($this->profileRelations() as $table => $relation) {
            $count = $this->countRelation($table, $relation, $profileId, $userIds);
            $items[] = $this->planItem($table, $relation, $count);
        }

        foreach ($this->userRelations() as $table => $relation) {
            $count = $this->countRelation($table, $relation, $profileId, $userIds);
            $items[] = $this->planItem($table, $relation, $count);
        }

        foreach ($this->ambiguousRelations() as $table => $relation) {
            $count = $this->countRelation($table, $relation, $profileId, $userIds);
            $items[] = $this->planItem($table, $relation, $count);
        }

        $privilegedAccounts = $users->filter(fn (User $user): bool => $user->isSuperAdmin());
        if ($privilegedAccounts->isNotEmpty()) {
            $items[] = [
                'table' => 'users',
                'label' => 'Privileged accounts',
                'strategy' => 'blocked',
                'count' => $privilegedAccounts->count(),
                'blocking' => true,
                'message' => 'Links to privileged accounts must be removed before deletion.',
            ];
            $blockingMessages[] = 'The candidate is linked to a privileged account.';
        } elseif ($users->isNotEmpty()) {
            $items[] = [
                'table' => 'users',
                'label' => 'Candidate accounts',
                'strategy' => 'owned',
                'count' => $users->count(),
                'blocking' => false,
                'message' => 'The linked candidate account and its login sessions will be deleted.',
            ];
        }

        $blockingItems = array_values(array_filter($items, fn (array $item): bool => (bool) ($item['blocking'] ?? false)));

        return [
            'profile' => [
                'id' => $profile->id,
                'full_name' => $profile->full_name,
                'reg_id' => $profile->reg_id,
                'phone' => $profile->phone,
                'email' => $profile->email,
            ],
            'accounts' => $users->map(fn (User $user): array => $this->safeUser($user))->values()->all(),
            'items' => $items,
            'blocking_items' => $blockingItems,
            'blocking_messages' => $blockingMessages,
            'can_delete' => $blockingMessages === [],
        ];
    }

    public function deleteCandidate(int $profileId, ?User $actor, ?string $reason = null): array
    {
        $plan = $this->deletionPlan($profileId);
        if (! $plan['can_delete']) {
            throw ValidationException::withMessages([
                'dependencies' => $plan['blocking_messages'],
            ]);
        }

        return DB::transaction(function () use ($profileId, $actor, $reason): array {
            $lockedProfile = DB::table('profiles')->where('id', $profileId)->lockForUpdate()->first();
            if ($lockedProfile === null) {
                throw (new ModelNotFoundException())->setModel(Profile::class, [$profileId]);
            }

            $plan = $this->deletionPlan($profileId);
            if (! $plan['can_delete']) {
                throw ValidationException::withMessages([
                    'dependencies' => $plan['blocking_messages'],
                ]);
            }

            $userIds = $this->candidateUserIds($profileId);
            $deleted = [];

            foreach ($this->profileRelations() as $table => $relation) {
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $relation['column'])) {
                    continue;
                }
                $deleted[$table] = DB::table($table)->where($relation['column'], $profileId)->delete();
            }

            foreach ($this->userRelations() as $table => $relation) {
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $relation['column']) || $userIds === []) {
                    continue;
                }
                $deleted[$table] = DB::table($table)->whereIn($relation['column'], $userIds)->delete();
            }

            foreach (['ticket_comments', 'tickets', 'user_interests', 'profile_visitors', 'meetings'] as $table) {
                $relation = $this->ambiguousRelations()[$table];
                if (! Schema::hasTable($table)) {
                    continue;
                }

                $query = DB::table($table);
                $this->applyRelationScope($query, $relation, $profileId, $userIds);
                $deleted[$table] = $query->delete();
            }

            if ($userIds !== []) {
                if (Schema::hasTable('api_token_sessions')) {
                    $deleted['api_token_sessions'] = DB::table('api_token_sessions')->whereIn('user_id', $userIds)->delete();
                }
                if (Schema::hasTable('personal_access_tokens')) {
                    $deleted['personal_access_tokens'] = DB::table('personal_access_tokens')
                        ->where('tokenable_type', User::class)
                        ->whereIn('tokenable_id', $userIds)
                        ->delete();
                }
                $deleted['users'] = DB::table('users')
                    ->where('profile_id', $profileId)
                    ->whereIn('id', $userIds)
                    ->delete();
            }

            $deleted['profiles'] = DB::table('profiles')->where('id', $profileId)->delete();

            $this->auditLogger->log(
                $actor,
                'database_master.candidate_deleted',
                'system_configuration',
                'profiles',
                $profileId,
                $profileId,
                ['profile' => $plan['profile'], 'deleted_counts' => $deleted],
                ['deleted' => true, 'reason' => $reason],
                'Candidate and all scoped related records permanently deleted from Database Master.'
            );

            $verified = ! DB::table('profiles')->where('id', $profileId)->exists();
            if (! $verified) {
                throw ValidationException::withMessages([
                    'delete' => 'Deletion could not be verified. The transaction has been rolled back.',
                ]);
            }

            return [
                'profile_id' => $profileId,
                'deleted_counts' => $deleted,
                'verified' => true,
            ];
        });
    }

    public function auditLogs(int $perPage): LengthAwarePaginator
    {
        return ActivityLog::query()
            ->where('action', 'like', 'database_master.%')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (ActivityLog $log): array => [
                'id' => $log->id,
                'action' => $log->action,
                'user_name' => $log->user_name_snapshot,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'candidate_id' => $log->candidate_id,
                'description' => $log->description,
                'new_values' => $log->new_values,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at,
            ]);
    }

    private function relationDefinition(string $table): ?array
    {
        return $this->profileRelations()[$table]
            ?? $this->userRelations()[$table]
            ?? $this->ambiguousRelations()[$table]
            ?? $this->candidateAccountRelations()[$table]
            ?? null;
    }

    private function editableRelatedColumns(string $table): array
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'id')) {
            return [];
        }

        return collect(Schema::getColumns($table))
            ->filter(fn (array $column): bool => (
                $table === 'profile_documents'
                && in_array($column['name'], ['income_proof', 'caste_certificate', 'medical_fitness_certificate'], true)
            ) || preg_match(self::READ_ONLY_RELATED_COLUMN_PATTERN, (string) $column['name']) !== 1)
            ->filter(fn (array $column): bool => preg_match(
                '/blob|binary|geometry/i',
                strtolower((string) ($column['type_name'] ?? '') . ' ' . (string) ($column['type'] ?? ''))
            ) !== 1)
            ->map(function (array $column): array {
                $rawType = strtolower((string) ($column['type_name'] ?? '') . ' ' . (string) ($column['type'] ?? ''));
                $type = match (true) {
                    str_contains($rawType, 'bool') || preg_match('/tinyint\s*\(\s*1\s*\)/', $rawType) === 1 => 'boolean',
                    str_contains($rawType, 'json') => 'json',
                    str_contains($rawType, 'int') => 'integer',
                    preg_match('/decimal|numeric|float|double|real/', $rawType) === 1 => 'number',
                    preg_match('/^date$/', $rawType) === 1 => 'date',
                    default => 'text',
                };

                return [
                    'name' => $column['name'],
                    'type' => $type,
                    'nullable' => (bool) ($column['nullable'] ?? true),
                ];
            })
            ->values()
            ->all();
    }

    private function profileRelations(): array
    {
        return [
            'profile_family_details' => ['label' => 'Family details', 'column' => 'profile_id', 'strategy' => 'owned'],
            'profile_education' => ['label' => 'Education records', 'column' => 'profile_id', 'strategy' => 'owned'],
            'profile_employment' => ['label' => 'Employment records', 'column' => 'profile_id', 'strategy' => 'owned'],
            'profile_religion_details' => ['label' => 'Religion details', 'column' => 'profile_id', 'strategy' => 'owned'],
            'profile_documents' => ['label' => 'Profile documents', 'column' => 'profile_id', 'strategy' => 'owned'],
            'profile_partner_preferences' => ['label' => 'Partner preferences', 'column' => 'profile_id', 'strategy' => 'owned'],
            'profile_melava_registrations' => ['label' => 'Melava registrations', 'column' => 'profile_id', 'strategy' => 'owned'],
            'payment_screenshots' => ['label' => 'Payment screenshots', 'column' => 'profile_id', 'strategy' => 'owned'],
            'document_verifications' => ['label' => 'Document verifications', 'column' => 'profile_id', 'strategy' => 'owned'],
            'melava_pending_registrations' => ['label' => 'Pending Melava registrations', 'column' => 'profile_id', 'strategy' => 'owned'],
        ];
    }

    private function userRelations(): array
    {
        return [
            'preferences' => ['label' => 'Account preferences', 'column' => 'user_id', 'strategy' => 'owned'],
            'payments' => ['label' => 'Payments', 'column' => 'user_id', 'strategy' => 'owned'],
            'candidate_notifications' => ['label' => 'Candidate notifications', 'column' => 'user_id', 'strategy' => 'owned'],
        ];
    }

    private function candidateAccountRelations(): array
    {
        return [
            'users' => [
                'label' => 'Candidate accounts',
                'strategy' => 'read_only',
                'scope' => 'candidate_account',
            ],
        ];
    }

    private function ambiguousRelations(): array
    {
        return [
            'user_interests' => [
                'label' => 'Match interests',
                'strategy' => 'ambiguous',
                'scope' => 'interest',
            ],
            'profile_visitors' => [
                'label' => 'Profile visitors',
                'strategy' => 'ambiguous',
                'scope' => 'visitor',
            ],
            'tickets' => [
                'label' => 'Support tickets',
                'strategy' => 'ambiguous',
                'scope' => 'user',
                'column' => 'user_id',
            ],
            'ticket_comments' => [
                'label' => 'Ticket comments',
                'strategy' => 'ambiguous',
                'scope' => 'user',
                'column' => 'user_id',
            ],
            'meetings' => [
                'label' => 'Meetings',
                'strategy' => 'ambiguous',
                'scope' => 'meeting',
            ],
        ];
    }

    private function applyRelationScope($query, array $relation, int $profileId, array $userIds): void
    {
        $scope = $relation['scope'] ?? null;
        if ($scope === 'candidate_account') {
            $query->where('profile_id', $profileId);
            return;
        }

        if ($scope === 'interest') {
            $query->where(function ($inner) use ($profileId, $userIds): void {
                $inner->where('profile_id', $profileId);
                if ($userIds !== []) {
                    $inner->orWhereIn('user_id', $userIds);
                }
            });
            return;
        }

        if ($scope === 'visitor') {
            $query->where(function ($inner) use ($profileId, $userIds): void {
                $inner->where('profile_id', $profileId);
                if ($userIds !== []) {
                    $inner->orWhereIn('visitor_id', $userIds);
                }
            });
            return;
        }

        if ($scope === 'meeting') {
            $query->where(function ($inner) use ($profileId): void {
                $inner->where('candidate_id', $profileId)
                    ->orWhere('other_candidate_id', $profileId);
            });
            return;
        }

        if ($scope === 'user') {
            if ($userIds === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn($relation['column'], $userIds);
            }
            return;
        }

        if (isset($relation['column'])) {
            $query->where($relation['column'], $profileId);
        }
    }

    private function countRelation(string $table, array $relation, int $profileId, array $userIds): int
    {
        if (! Schema::hasTable($table)) {
            return 0;
        }

        $query = DB::table($table);
        $this->applyRelationScope($query, $relation, $profileId, $userIds);

        return (int) $query->count();
    }

    private function planItem(string $table, array $relation, int $count): array
    {
        $strategy = $relation['strategy'] === 'ambiguous' ? 'shared' : $relation['strategy'];

        return [
            'table' => $table,
            'label' => $relation['label'],
            'strategy' => $strategy,
            'count' => $count,
            'blocking' => false,
            'message' => $strategy === 'owned'
                ? 'Exclusively linked records; eligible for transactional deletion.'
                : 'Candidate-linked records will be removed; shared relationship rows may affect other candidates.',
        ];
    }

    private function candidateUserIds(int $profileId): array
    {
        return User::query()
            ->where('profile_id', $profileId)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    private function safeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'username' => $user->username,
            'status' => $user->status,
            'role' => $user->role ? [
                'id' => $user->role->id,
                'name' => $user->role->name,
                'user_type' => $user->role->user_type,
                'is_active' => $user->role->is_active,
            ] : null,
            'created_at' => $user->created_at,
        ];
    }

    private function safeRow(array $row): array
    {
        $safe = [];
        foreach ($row as $key => $value) {
            if ($this->isSensitiveColumn((string) $key)) {
                $safe[$key] = '[redacted]';
                continue;
            }

            if (is_string($value) && Str::length($value) > 2000) {
                $value = Str::limit($value, 2000);
            }

            $safe[$key] = $value;
        }

        return $safe;
    }

    private function isSensitiveColumn(string $column): bool
    {
        return preg_match(self::SENSITIVE_COLUMN_PATTERN, $column) === 1;
    }

    private function columnsForTable(string $table): array
    {
        return Schema::getColumnListing($table);
    }
}
