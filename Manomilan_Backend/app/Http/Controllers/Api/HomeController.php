<?php

namespace App\Http\Controllers\Api;

use App\Profile;
use App\ProfileVisitor;
use App\UserInterest;
use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;
use Throwable;

class HomeController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        try {
            if ($user->isAdmin()) {
                $from = null;
                $to = null;
                if ($request->input('period') === 'today') {
                    $from = now()->startOfDay();
                    $to = now()->endOfDay();
                } elseif ($request->input('period') === 'week') {
                    $from = now()->startOfWeek();
                    $to = now()->endOfDay();
                } elseif ($request->filled('from')) {
                    $from = Carbon::parse($request->input('from'))->startOfDay();
                    $to = $request->filled('to')
                        ? Carbon::parse($request->input('to'))->endOfDay()
                        : Carbon::parse($request->input('from'))->endOfDay();
                }

                $dated = function ($query) use ($from, $to) {
                    if ($from) {
                        $query->where('created_at', '>=', $from);
                    }
                    if ($to) {
                        $query->where('created_at', '<=', $to);
                    }
                };

                $profileQuery = Profile::where('status', 'active');
                $datedProfileQuery = clone $profileQuery;
                $userQuery = User::query();
                $campaignQuery = DB::table('melava_campaigns');
                $registrationQuery = DB::table('profile_melava_registrations');
                $datedUserQuery = clone $userQuery;
                $datedCampaignQuery = clone $campaignQuery;
                $datedRegistrationQuery = clone $registrationQuery;
                $dated($datedProfileQuery);
                $dated($datedUserQuery);
                $dated($datedCampaignQuery);
                $dated($datedRegistrationQuery);
                $trendStart = now()->subDays(6)->startOfDay();
                $trendEnd = now()->startOfDay()->addDay();
                $userTrendCounts = User::where('created_at', '>=', $trendStart)
                    ->where('created_at', '<', $trendEnd)
                    ->selectRaw('DATE(created_at) as trend_date, COUNT(*) as total')
                    ->groupBy('trend_date')
                    ->pluck('total', 'trend_date');
                $profileTrendCounts = Profile::where('status', 'active')
                    ->where('created_at', '>=', $trendStart)
                    ->where('created_at', '<', $trendEnd)
                    ->selectRaw('DATE(created_at) as trend_date, COUNT(*) as total')
                    ->groupBy('trend_date')
                    ->pluck('total', 'trend_date');
                $trendLabels = [];
                $trendUsers = [];
                $trendProfiles = [];
                for ($offset = 6; $offset >= 0; $offset--) {
                    $day = $trendStart->copy()->addDays($offset);
                    $date = $day->toDateString();
                    $trendLabels[] = $day->format('M d');
                    $trendUsers[] = (int) ($userTrendCounts[$date] ?? 0);
                    $trendProfiles[] = (int) ($profileTrendCounts[$date] ?? 0);
                }
                $recentProfiles = Profile::where('status', 'active')
                    ->whereBetween('created_at', [now()->subDays(10), now()])
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->with(['educations', 'employments'])
                    ->get()
                    ->map(function (Profile $profile): array {
                        $employment = $profile->employments->sortByDesc('id')->first();
                        $education = $profile->educations->sortByDesc('id')->first();
                        $photo = $profile->photoPath('profile_photo');
                        $photo = $profile->profilePhotoWithFallback($photo);

                        return [
                            'id' => $profile->id,
                            'name' => $profile->full_name ?: 'Candidate',
                            'photo' => $this->profilePhotoUrl(is_string($photo) ? $photo : null),
                            'type' => ucfirst((string) $profile->groomorbride),
                            'location' => $employment?->employment_city
                                ?: $education?->education_city
                                ?: $this->profileAddressCity($profile)
                                ?: 'Not set',
                            'registration_number' => $profile->reg_id ?: '',
                            'status' => $profile->verification_status === 'Completed' ? 'Verified' : 'Pending',
                            'created_at' => $profile->created_at?->toDateTimeString(),
                        ];
                    });
                $eventRegistrationCounts = DB::table('profile_melava_registrations')
                    ->select('melava_campaign_id')
                    ->selectRaw('COUNT(*) as registrations_count')
                    ->selectRaw('SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as payment_verified_count');
                $dated($eventRegistrationCounts);
                $eventRegistrationCounts->groupBy('melava_campaign_id');
                $upcomingEvents = DB::table('melava_campaigns as campaign')
                    ->leftJoinSub(
                        $eventRegistrationCounts,
                        'registration_counts',
                        'campaign.id',
                        '=',
                        'registration_counts.melava_campaign_id'
                    )
                    ->select('campaign.*')
                    ->selectRaw('COALESCE(registration_counts.registrations_count, 0) as registrations_count')
                    ->selectRaw('COALESCE(registration_counts.payment_verified_count, 0) as payment_verified_count')
                    ->where('status', 'active')
                    ->where(function ($query) {
                        $today = now()->toDateString();
                        $query->where('campaign.start_date', '>=', $today)
                            ->orWhere(function ($ongoing) use ($today) {
                                $ongoing->where('campaign.start_date', '<', $today)
                                    ->where('campaign.end_date', '>=', $today);
                            });
                    })
                    ->orderBy('campaign.start_date')
                    ->get()
                    ->map(function ($campaign) {
                        $campaign->registrations_count = (int) $campaign->registrations_count;
                        $campaign->payment_verified_count = (int) $campaign->payment_verified_count;
                        $today = now()->toDateString();
                        if (! $campaign->start_date) {
                            $campaign->schedule_status = 'Undated';
                        } elseif ($campaign->start_date > $today) {
                            $campaign->schedule_status = 'Upcoming';
                        } elseif (($campaign->end_date ?: $campaign->start_date) < $today) {
                            $campaign->schedule_status = 'Completed';
                        } else {
                            $campaign->schedule_status = 'Ongoing';
                        }
                        return $campaign;
                    });

                $profileStats = (clone $datedProfileQuery)
                    ->selectRaw('COUNT(*) as total')
                    ->selectRaw("SUM(CASE WHEN verification_status = 'Completed' THEN 1 ELSE 0 END) as verified")
                    ->selectRaw("SUM(CASE WHEN verification_status = 'Pending' THEN 1 ELSE 0 END) as pending")
                    ->selectRaw("SUM(CASE WHEN groomorbride = 'Groom' THEN 1 ELSE 0 END) as grooms")
                    ->selectRaw("SUM(CASE WHEN groomorbride = 'Bride' THEN 1 ELSE 0 END) as brides")
                    ->first();
                $campaignStats = (clone $datedCampaignQuery)
                    ->selectRaw('COUNT(*) as total')
                    ->selectRaw(
                        'SUM(CASE WHEN status = ? AND (start_date IS NULL OR start_date >= ?) THEN 1 ELSE 0 END) as upcoming',
                        ['active', now()->toDateString()]
                    )
                    ->first();
                $registrationStats = (clone $datedRegistrationQuery)
                    ->selectRaw('COUNT(*) as total')
                    ->selectRaw('SUM(CASE WHEN payment_verified = 0 THEN 1 ELSE 0 END) as pending')
                    ->selectRaw('SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as verified')
                    ->first();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'role' => 'admin',
                        'total_users' => $datedUserQuery->count(),
                        'total_profiles' => (int) ($profileStats->total ?? 0),
                        'verified_profiles' => (int) ($profileStats->verified ?? 0),
                        'pending_profiles' => (int) ($profileStats->pending ?? 0),
                        'groom_profiles' => (int) ($profileStats->grooms ?? 0),
                        'bride_profiles' => (int) ($profileStats->brides ?? 0),
                        'melava_campaigns' => (int) ($campaignStats->total ?? 0),
                        'upcoming_melava_campaigns' => (int) ($campaignStats->upcoming ?? 0),
                        'melava_registrations' => (int) ($registrationStats->total ?? 0),
                        'pending_melava_payments' => (int) ($registrationStats->pending ?? 0),
                        'verified_melava_payments' => (int) ($registrationStats->verified ?? 0),
                        'upcoming_melava_events' => $upcomingEvents,
                        'trend_labels' => $trendLabels,
                        'trend_users' => $trendUsers,
                        'trend_profiles' => $trendProfiles,
                        'recent_profiles' => $recentProfiles,
                    ],
                ]);
            }

            $profile = $user->profile_id ? Profile::find($user->profile_id) : null;
            $profileId = $profile?->id;

            return response()->json([
                'success' => true,
                'data' => [
                    'role' => 'candidate',
                    'profile_views' => $profileId ? ProfileVisitor::where('profile_id', $profileId)->count() : 0,
                    'interests_received' => $profileId ? UserInterest::where('profile_id', $profileId)->count() : 0,
                    'interests_sent' => UserInterest::where('user_id', $user->id)->count(),
                    'profile_completion' => (int) ($profile->profile_completion ?? 0),
                    'profile_id' => $profileId,
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to load dashboard data right now.',
            ], 500);
        }
    }

    public function reports(Request $request)
    {
        $data = $request->validate([
            'period' => ['nullable', \Illuminate\Validation\Rule::in(['today', 'week', 'month', 'all'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'gender' => ['nullable', \Illuminate\Validation\Rule::in(['all', 'Groom', 'Bride'])],
            'status' => ['nullable', \Illuminate\Validation\Rule::in(['all', 'active', 'deactive', 'verified', 'pending'])],
            'source' => ['nullable', 'string', 'max:120'],
        ]);

        $user = $request->user();
        if (! $user || ! $user->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Administrator access is required.'], 403);
        }

        try {
            $period = $data['period'] ?? 'all';
            $now = now();
            $from = match ($period) {
                'today' => $now->copy()->startOfDay(),
                'week' => $now->copy()->startOfWeek(),
                'month' => $now->copy()->startOfMonth(),
                default => null,
            };
            $to = $now->copy()->endOfDay();
            if (! empty($data['from'])) {
                $from = Carbon::parse($data['from'])->startOfDay();
                $to = Carbon::parse($data['to'] ?? $data['from'])->endOfDay();
            }

            $applyDates = static function ($query, string $column = 'created_at') use ($from, $to): void {
                if ($from) {
                    $query->whereBetween($column, [$from, $to]);
                }
            };

            $profilesForSourceOptions = DB::table('profiles');
            $applyDates($profilesForSourceOptions);
            if (($data['gender'] ?? 'all') !== 'all') {
                $profilesForSourceOptions->where('groomorbride', $data['gender']);
            }
            $status = $data['status'] ?? 'all';
            if (in_array($status, ['active', 'deactive'], true)) {
                $profilesForSourceOptions->where('status', $status);
            } elseif ($status === 'verified') {
                $profilesForSourceOptions->where('verification_status', 'Completed');
            } elseif ($status === 'pending') {
                $profilesForSourceOptions->where('verification_status', 'Pending');
            }

            $profiles = clone $profilesForSourceOptions;
            if (! empty($data['source']) && Schema::hasColumn('profiles', 'source_of_information')) {
                $profiles->where('source_of_information', $data['source']);
            }
            $gender = $data['gender'] ?? 'all';
            if ($gender !== 'all') {
                $profiles->where('groomorbride', $gender);
            }

            $profileStats = (clone $profiles)
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active")
                ->selectRaw("SUM(CASE WHEN status = 'deactive' THEN 1 ELSE 0 END) as inactive")
                ->selectRaw("SUM(CASE WHEN status = 'active' AND verification_status = 'Completed' THEN 1 ELSE 0 END) as verified")
                ->selectRaw("SUM(CASE WHEN status = 'active' AND verification_status = 'Pending' THEN 1 ELSE 0 END) as pending")
                ->selectRaw("SUM(CASE WHEN groomorbride = 'Groom' THEN 1 ELSE 0 END) as grooms")
                ->selectRaw("SUM(CASE WHEN groomorbride = 'Bride' THEN 1 ELSE 0 END) as brides")
                ->first();
            $profileTotal = (int) ($profileStats->total ?? 0);
            $activeProfiles = (int) ($profileStats->active ?? 0);
            $verifiedProfiles = (int) ($profileStats->verified ?? 0);
            $pendingProfiles = (int) ($profileStats->pending ?? 0);
            $inactiveProfiles = (int) ($profileStats->inactive ?? 0);
            $grooms = (int) ($profileStats->grooms ?? 0);
            $brides = (int) ($profileStats->brides ?? 0);

            $users = DB::table('users');
            $applyDates($users);
            if ($gender !== 'all' || ! empty($data['source']) || in_array($status, ['active', 'deactive', 'verified', 'pending'], true)) {
                $users->whereIn('profile_id', (clone $profiles)->select('id'));
            }

            $events = DB::table('melava_campaigns');
            $applyDates($events);
            $registrations = DB::table('profile_melava_registrations');
            $applyDates($registrations);
            $registrations->whereIn('profile_id', (clone $profiles)->select('id'));
            $bookletPaymentAvailable = Schema::hasColumn('profile_melava_registrations', 'booklet_payment_verified');
            $registrationStatsQuery = (clone $registrations)
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as verified')
                ->selectRaw('SUM(CASE WHEN payment_verified = 0 THEN 1 ELSE 0 END) as pending');
            if ($bookletPaymentAvailable) {
                $registrationStatsQuery
                    ->selectRaw('SUM(CASE WHEN is_booklet_req = 1 AND booklet_payment_verified = 1 THEN 1 ELSE 0 END) as verified_booklet')
                    ->selectRaw('SUM(CASE WHEN is_booklet_req = 1 AND booklet_payment_verified = 0 THEN 1 ELSE 0 END) as pending_booklet');
            }
            $registrationStats = $registrationStatsQuery->first();
            $melavaRegistrationCount = (int) ($registrationStats->total ?? 0);
            $verifiedMelavaPayments = (int) ($registrationStats->verified ?? 0);
            $pendingMelavaPayments = (int) ($registrationStats->pending ?? 0);
            $verifiedBookletPayments = $bookletPaymentAvailable ? (int) ($registrationStats->verified_booklet ?? 0) : 0;
            $pendingBookletPayments = $bookletPaymentAvailable ? (int) ($registrationStats->pending_booklet ?? 0) : 0;
            $melavaRegistrationCounts = (clone $registrations)
                ->select('melava_campaign_id')
                ->selectRaw('COUNT(*) as registration_count')
                ->groupBy('melava_campaign_id');
            $melavaEventDetails = DB::table('melava_campaigns as campaign')
                ->leftJoinSub($melavaRegistrationCounts, 'registration_counts', 'campaign.id', '=', 'registration_counts.melava_campaign_id')
                ->select(
                    'campaign.id',
                    'campaign.melava_code as code',
                    'campaign.title',
                    'campaign.start_date',
                    'campaign.end_date',
                    'campaign.status',
                )
                ->selectRaw('COALESCE(registration_counts.registration_count, 0) as registrations');
            $applyDates($melavaEventDetails, 'campaign.created_at');
            $melavaEventDetails = $melavaEventDetails->orderByDesc('registrations')->limit(10)->get();

            $hasWorkshopEvents = Schema::hasTable('workshop_events');
            $hasWorkshopRegistrations = Schema::hasTable('workshop_registrations');
            $workshopEvents = $hasWorkshopEvents ? DB::table('workshop_events') : null;
            if ($workshopEvents) {
                $applyDates($workshopEvents);
            }
            $workshopRegistrations = $hasWorkshopRegistrations
                ? DB::table('workshop_registrations')
                : null;
            if ($workshopRegistrations) {
                $applyDates($workshopRegistrations);
                if (Schema::hasColumn('workshop_registrations', 'profile_id')) {
                    $workshopRegistrations->whereIn('profile_id', (clone $profiles)->select('id'));
                }
            }
            $workshopStats = $workshopRegistrations
                ? (clone $workshopRegistrations)
                    ->selectRaw('COUNT(*) as total')
                    ->selectRaw("SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verified")
                    ->selectRaw("SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending")
                    ->selectRaw("SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected")
                    ->first()
                : null;
            $verifiedWorkshopRegistrations = (int) ($workshopStats->verified ?? 0);
            $pendingWorkshopRegistrations = (int) ($workshopStats->pending ?? 0);
            $rejectedWorkshopRegistrations = (int) ($workshopStats->rejected ?? 0);
            $workshopEventDetails = collect();
            $hasWorkshopEventId = $hasWorkshopRegistrations
                && Schema::hasColumn('workshop_registrations', 'workshop_event_id');
            if ($workshopEvents && $workshopRegistrations && $hasWorkshopEventId) {
                $workshopRegistrationCounts = (clone $workshopRegistrations)
                    ->select('workshop_event_id')
                    ->selectRaw('COUNT(*) as registration_count')
                    ->groupBy('workshop_event_id');
                $workshopEventDetails = DB::table('workshop_events as event')
                    ->leftJoinSub($workshopRegistrationCounts, 'registration_counts', 'event.id', '=', 'registration_counts.workshop_event_id')
                    ->select(
                        'event.id',
                        'event.workshop_code as code',
                        'event.title',
                        'event.start_date',
                        'event.end_date',
                        'event.status',
                    )
                    ->selectRaw('COALESCE(registration_counts.registration_count, 0) as registrations')
                    ->when($from, fn ($query) => $query->whereBetween('event.created_at', [$from, $to]))
                    ->orderByDesc('registrations')
                    ->limit(10)
                    ->get();
            }

            $completionAvailable = Schema::hasColumn('profiles', 'profile_completion');
            $completion = $completionAvailable
                ? (clone $profiles)->selectRaw('AVG(profile_completion) as average')
                    ->selectRaw('SUM(CASE WHEN profile_completion < 100 THEN 1 ELSE 0 END) as incomplete')
                ->selectRaw('SUM(CASE WHEN profile_completion IS NULL THEN 1 ELSE 0 END) as not_scored')
                ->selectRaw('SUM(CASE WHEN profile_completion >= 0 AND profile_completion < 25 THEN 1 ELSE 0 END) as band_0_24')
                ->selectRaw('SUM(CASE WHEN profile_completion >= 25 AND profile_completion < 50 THEN 1 ELSE 0 END) as band_25_49')
                ->selectRaw('SUM(CASE WHEN profile_completion >= 50 AND profile_completion < 75 THEN 1 ELSE 0 END) as band_50_74')
                ->selectRaw('SUM(CASE WHEN profile_completion >= 75 AND profile_completion < 100 THEN 1 ELSE 0 END) as band_75_99')
                ->selectRaw('SUM(CASE WHEN profile_completion >= 100 AND profile_completion < 101 THEN 1 ELSE 0 END) as band_100')
                ->first()
                : null;
            $completionBands = [];
            if ($completionAvailable) {
                foreach ([
                    ['label' => '0-24%', 'key' => 'band_0_24'],
                    ['label' => '25-49%', 'key' => 'band_25_49'],
                    ['label' => '50-74%', 'key' => 'band_50_74'],
                    ['label' => '75-99%', 'key' => 'band_75_99'],
                    ['label' => '100%', 'key' => 'band_100'],
                ] as $band) {
                    $completionBands[] = [
                        'label' => $band['label'],
                        'count' => (int) ($completion->{$band['key']} ?? 0),
                    ];
                }
            }

            $sources = [];
            if (Schema::hasColumn('profiles', 'source_of_information')) {
                $sources = (clone $profilesForSourceOptions)
                    ->whereNotNull('source_of_information')
                    ->where('source_of_information', '!=', '')
                    ->selectRaw('source_of_information as label, COUNT(*) as count')
                    ->groupBy('source_of_information')
                    ->orderBy('source_of_information')
                    ->get()
                    ->map(fn ($row) => ['label' => $row->label, 'count' => (int) $row->count])
                    ->values();
            }

            $activity = [
                'profile_views' => 0,
                'unique_profiles_viewed' => 0,
                'interests' => 0,
                'pending_interests' => 0,
            ];
            if (Schema::hasTable('profile_visitors')) {
                $visitors = DB::table('profile_visitors')->whereIn('profile_id', (clone $profiles)->select('id'));
                $applyDates($visitors);
                $visitorStats = (clone $visitors)
                    ->selectRaw('COUNT(*) as profile_views')
                    ->selectRaw('COUNT(DISTINCT profile_id) as unique_profiles_viewed')
                    ->first();
                $activity['profile_views'] = (int) ($visitorStats->profile_views ?? 0);
                $activity['unique_profiles_viewed'] = (int) ($visitorStats->unique_profiles_viewed ?? 0);
            }
            if (Schema::hasTable('user_interests')) {
                $interests = DB::table('user_interests')->whereIn('profile_id', (clone $profiles)->select('id'));
                $applyDates($interests);
                $interestStats = (clone $interests)
                    ->selectRaw('COUNT(*) as interests')
                    ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_interests")
                    ->first();
                $activity['interests'] = (int) ($interestStats->interests ?? 0);
                $activity['pending_interests'] = (int) ($interestStats->pending_interests ?? 0);
            }

            $paymentMetrics = [
                'entries' => 0,
                'verified_entries' => 0,
                'pending_entries' => 0,
            ];
            $hasPaymentScreenshots = Schema::hasTable('payment_screenshots');
            if ($hasPaymentScreenshots) {
                $payments = DB::table('payment_screenshots')
                    ->whereIn('profile_id', (clone $profiles)->select('id'));
                $applyDates($payments);
                $paymentStats = (clone $payments)
                    ->selectRaw('COUNT(*) as entries')
                    ->selectRaw('SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as verified_entries')
                    ->selectRaw('SUM(CASE WHEN payment_verified = 0 THEN 1 ELSE 0 END) as pending_entries')
                    ->selectRaw('COUNT(DISTINCT profile_id) as profiles_with_payments')
                    ->first();
                $paymentMetrics['entries'] = (int) ($paymentStats->entries ?? 0);
                $paymentMetrics['verified_entries'] = (int) ($paymentStats->verified_entries ?? 0);
                $paymentMetrics['pending_entries'] = (int) ($paymentStats->pending_entries ?? 0);
            }
            $profilesWithPayments = $hasPaymentScreenshots
                ? (int) ($paymentStats->profiles_with_payments ?? 0)
                : 0;

            $trendFrom = $from ?: $now->copy()->subMonths(11)->startOfMonth();
            $trendTo = $to;
            $days = $trendFrom->diffInDays($trendTo);
            $granularity = $period === 'today' ? 'hour' : ($days <= 31 ? 'day' : 'month');
            $trendQuery = clone $profiles;
            $trendQuery->whereBetween('created_at', [$trendFrom, $trendTo]);
            $bucketExpression = match ($granularity) {
                'hour' => 'HOUR(created_at)',
                'day' => 'DATE(created_at)',
                default => "DATE_FORMAT(created_at, '%Y-%m-01')",
            };
            $trendRows = $trendQuery
                ->selectRaw("$bucketExpression as bucket, groomorbride as gender, COUNT(*) as count")
                ->groupBy('bucket', 'gender')
                ->get();
            $trend = [];
            if ($granularity === 'hour') {
                for ($hour = 0; $hour <= (int) $now->format('G'); $hour++) {
                    $key = (string) $hour;
                    $trend[] = [
                        'label' => str_pad((string) $hour, 2, '0', STR_PAD_LEFT),
                        'profiles' => (int) $trendRows->where('bucket', $hour)->sum('count'),
                        'grooms' => (int) $trendRows->where('bucket', $hour)->where('gender', 'Groom')->sum('count'),
                        'brides' => (int) $trendRows->where('bucket', $hour)->where('gender', 'Bride')->sum('count'),
                        'key' => $key,
                    ];
                }
            } else {
                $cursor = $granularity === 'day' ? $trendFrom->copy()->startOfDay() : $trendFrom->copy()->startOfMonth();
                $last = $granularity === 'day' ? $trendTo->copy()->startOfDay() : $trendTo->copy()->startOfMonth();
                while ($cursor <= $last) {
                    $key = $granularity === 'day' ? $cursor->toDateString() : $cursor->format('Y-m-01');
                    $rows = $trendRows->where('bucket', $key);
                    $trend[] = [
                        'label' => $granularity === 'day'
                            ? $cursor->format('M j')
                            : ($days > 365 ? $cursor->format('M Y') : $cursor->format('M')),
                        'profiles' => (int) $rows->sum('count'),
                        'grooms' => (int) $rows->where('gender', 'Groom')->sum('count'),
                        'brides' => (int) $rows->where('gender', 'Bride')->sum('count'),
                        'key' => $key,
                    ];
                    $cursor->add($granularity === 'day' ? 1 : 1, $granularity === 'day' ? 'day' : 'month');
                }
            }

            $locations = [];
            if (Schema::hasTable('profile_employment') && Schema::hasTable('profile_education')) {
                $latestEmploymentIds = DB::table('profile_employment')->selectRaw('MAX(id) as id')->groupBy('profile_id');
                $latestEducationIds = DB::table('profile_education')->selectRaw('MAX(id) as id')->groupBy('profile_id');
                $employmentCities = DB::table('profile_employment as employment')
                    ->joinSub($latestEmploymentIds, 'latest_employment', 'employment.id', '=', 'latest_employment.id')
                    ->select('employment.profile_id', 'employment.employment_city');
                $educationCities = DB::table('profile_education as education')
                    ->joinSub($latestEducationIds, 'latest_education', 'education.id', '=', 'latest_education.id')
                    ->select('education.profile_id', 'education.education_city');
                $cityExpression = "COALESCE(NULLIF(employment.employment_city, ''), NULLIF(education.education_city, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(filtered_profiles.addresses, '$.current.city')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(filtered_profiles.addresses, '$.city')), ''))";
                $locations = DB::query()
                    ->fromSub((clone $profiles)->select('id', 'addresses'), 'filtered_profiles')
                    ->leftJoinSub($employmentCities, 'employment', 'filtered_profiles.id', '=', 'employment.profile_id')
                    ->leftJoinSub($educationCities, 'education', 'filtered_profiles.id', '=', 'education.profile_id')
                    ->selectRaw("$cityExpression as label, COUNT(*) as count")
                    ->whereRaw("$cityExpression IS NOT NULL")
                    ->groupBy('label')
                    ->orderByDesc('count')
                    ->limit(6)
                    ->get()
                    ->map(fn ($row) => ['label' => $row->label, 'count' => (int) $row->count])
                    ->values();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => $period,
                    'range' => ['from' => $from?->toDateString(), 'to' => $from ? $to->toDateString() : null],
                    'trend_range' => [
                        'from' => $trendFrom->toDateString(),
                        'to' => $trendTo->toDateString(),
                        'granularity' => $granularity,
                    ],
                    'generated_at' => now()->toIso8601String(),
                    'total_users' => $users->count(),
                    'total_profiles' => $profileTotal,
                    'active_profiles' => $activeProfiles,
                    'inactive_profiles' => $inactiveProfiles,
                    'verified_profiles' => $verifiedProfiles,
                    'pending_profiles' => $pendingProfiles,
                    'groom_profiles' => $grooms,
                    'bride_profiles' => $brides,
                    'melava_campaigns' => (clone $events)->count(),
                    'melava_registrations' => $melavaRegistrationCount,
                    'verified_melava_payments' => $verifiedMelavaPayments,
                    'pending_melava_payments' => $pendingMelavaPayments,
                    'verified_booklet_payments' => $verifiedBookletPayments,
                    'pending_booklet_payments' => $pendingBookletPayments,
                    'workshop_events' => $workshopEvents ? (clone $workshopEvents)->count() : 0,
                    'workshop_registrations' => (int) ($workshopStats->total ?? 0),
                    'verified_workshop_registrations' => $verifiedWorkshopRegistrations,
                    'pending_workshop_registrations' => $pendingWorkshopRegistrations,
                    'rejected_workshop_registrations' => $rejectedWorkshopRegistrations,
                    'profiles_with_payments' => $profilesWithPayments,
                    'melava_event_details' => $melavaEventDetails,
                    'workshop_event_details' => $workshopEventDetails,
                    'profile_completion' => [
                        'available' => $completionAvailable,
                        'average' => $completion?->average === null ? null : round((float) $completion->average, 1),
                        'incomplete' => (int) ($completion->incomplete ?? 0),
                        'not_scored' => (int) ($completion->not_scored ?? 0),
                        'bands' => $completionBands,
                    ],
                    'trend' => $trend,
                    'profile_status_distribution' => [
                        ['label' => 'Verified', 'count' => $verifiedProfiles],
                        ['label' => 'Pending verification', 'count' => $pendingProfiles],
                        ['label' => 'Inactive', 'count' => $inactiveProfiles],
                        ['label' => 'Other / unclassified', 'count' => max($profileTotal - $verifiedProfiles - $pendingProfiles - $inactiveProfiles, 0)],
                    ],
                    'gender_distribution' => [
                        ['label' => 'Groom', 'count' => $grooms],
                        ['label' => 'Bride', 'count' => $brides],
                    ],
                    'sources' => $sources,
                    'locations' => $locations,
                    'payments' => $paymentMetrics,
                    'activity' => $activity,
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to load report analytics right now.',
            ], 500);
        }
    }


    public function homeData(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        try {
            $profile = $user->profile_id
                ? Profile::with('user')->find($user->profile_id)
                : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'username' => $user->username,
                        'role_id' => $user->role_id,
                        'user_type' => $user->user_type,
                        'status' => $user->status,
                    ],
                    'profile' => $profile ? [
                        'id' => $profile->id,
                        'registration_number' => $profile->reg_id,
                        'profile_id' => $profile->reg_id,
                        'full_name' => $profile->full_name,
                        'gender' => $profile->groomorbride,
                        'photo_url' => $this->profilePhotoUrl($profile->photoPath('profile_photo')),
                        'profile_photo' => $profile->photoPath('profile_photo'),
                        'full_body_photo' => $profile->photoPath('full_body_photo'),
                        'half_body_photo' => $profile->photoPath('half_body_photo'),
                        'selfie_photo' => $profile->photoPath('selfie_photo'),
                        'profile_completion' => null,
                        'verification_status' => $profile->verification_status,
                        'birth_date' => $profile->birth_date,
                        'city' => $profile->employments()->latest('id')->value('employment_city')
                            ?: $profile->educations()->latest('id')->value('education_city')
                            ?: $this->profileAddressCity($profile),
                        'education' => $profile->educations()->latest('id')->value('degree_name'),
                        'profession' => $profile->employments()->latest('id')->value('profession'),
                        'has_family' => $profile->familyDetails()->exists(),
                        'has_education' => $profile->educations()->exists(),
                        'has_photos' => filled($profile->photoPath('profile_photo')),
                        'has_preferences' => $profile->partnerPreferences()->exists()
                            || $user->preference()->exists(),
                    ] : null,
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to load profile data right now.',
            ], 500);
        }
    }

    private function profilePhotoUrl(?string $path): string
    {
        if (! $path) {
            return '';
        }

        $path = trim($path);

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            return url($path);
        }

        if (str_starts_with($path, 'candidate/')) {
            return url('storage/'.$path);
        }

        if (str_starts_with($path, 'additional_photos/') || str_starts_with($path, 'profile_photos/')) {
            return url('storage/'.$path);
        }

        return url($path);
    }

    private function profileAddressCity(Profile $profile): ?string
    {
        $addresses = $profile->addresses;
        if (! is_array($addresses)) {
            return null;
        }

        if (filled($addresses['city'] ?? null)) {
            return $addresses['city'];
        }

        foreach ($addresses as $address) {
            if (is_array($address) && filled($address['city'] ?? null)) {
                return $address['city'];
            }
        }

        return null;
    }
}
