<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEXES = [
        'users' => [
            'users_created_at_index' => ['created_at'],
        ],
        'user_interests' => [
            'user_interests_user_created_index' => ['user_id', 'created_at'],
        ],
        'candidate_notifications' => [
            'candidate_notifications_user_read_created_index' => ['user_id', 'read_at', 'created_at'],
        ],
        'payment_screenshots' => [
            'payment_screenshots_created_at_index' => ['created_at'],
            'payment_screenshots_profile_created_index' => ['profile_id', 'created_at'],
        ],
        'profile_melava_registrations' => [
            'profile_melava_created_at_index' => ['created_at'],
            'profile_melava_payment_created_index' => ['payment_verified', 'created_at'],
            'profile_melava_booklet_created_index' => ['is_booklet_req', 'created_at'],
            'profile_melava_campaign_created_index' => ['melava_campaign_id', 'created_at'],
        ],
        'workshop_registrations' => [
            'workshop_registrations_status_created_index' => ['status', 'created_at'],
        ],
        'melava_campaigns' => [
            'melava_campaigns_status_id_index' => ['status', 'id'],
        ],
        'activity_logs' => [
            'activity_logs_action_created_index' => ['action', 'created_at'],
            'activity_logs_module_created_index' => ['module_id', 'created_at'],
        ],
        'meetings' => [
            'meetings_candidate_created_index' => ['candidate_id', 'created_at'],
            'meetings_other_candidate_created_index' => ['other_candidate_id', 'created_at'],
        ],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $tableName => $indexes) {
            foreach ($indexes as $indexName => $columns) {
                if (! Schema::hasIndex($tableName, $columns)) {
                    Schema::table($tableName, static function (Blueprint $table) use ($columns, $indexName): void {
                        $table->index($columns, $indexName);
                    });
                }
            }
        }
    }

    public function down(): void
    {
        foreach (self::INDEXES as $tableName => $indexes) {
            foreach (array_keys($indexes) as $indexName) {
                if (Schema::hasIndex($tableName, $indexName)) {
                    Schema::table($tableName, static function (Blueprint $table) use ($indexName): void {
                        $table->dropIndex($indexName);
                    });
                }
            }
        }
    }
};
