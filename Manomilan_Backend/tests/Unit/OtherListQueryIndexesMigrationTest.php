<?php

namespace Tests\Unit;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OtherListQueryIndexesMigrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.foreign_key_constraints' => true,
        ]);
        DB::purge('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('user_interests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('profile_id');
            $table->timestamp('created_at')->nullable();
            $table->unique(['user_id', 'profile_id']);
            $table->index(['profile_id', 'created_at']);
        });

        Schema::create('candidate_notifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'read_at']);
        });

        Schema::create('payment_screenshots', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id');
            $table->boolean('payment_verified')->default(false);
            $table->timestamp('created_at')->nullable();
            $table->index(['profile_id', 'payment_verified', 'created_at']);
        });

        Schema::create('profile_melava_registrations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id');
            $table->unsignedBigInteger('melava_campaign_id');
            $table->boolean('payment_verified')->default(false);
            $table->boolean('is_booklet_req')->default(false);
            $table->timestamp('created_at')->nullable();
            $table->index('profile_id');
            $table->index('melava_campaign_id');
            $table->unique(['profile_id', 'melava_campaign_id']);
        });

        Schema::create('workshop_registrations', function (Blueprint $table): void {
            $table->id();
            $table->string('status');
            $table->timestamp('created_at')->nullable();
            $table->index('created_at');
        });

        Schema::create('melava_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->string('status');
            $table->date('start_date')->nullable();
            $table->index(['status', 'start_date']);
        });

        Schema::create('activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('action');
            $table->unsignedBigInteger('module_id')->nullable();
            $table->unsignedBigInteger('candidate_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['created_at', 'action']);
            $table->index(['user_id', 'created_at']);
            $table->index(['candidate_id', 'created_at']);
        });

        Schema::create('meetings', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('candidate_id')->nullable();
            $table->unsignedBigInteger('other_candidate_id')->nullable();
            $table->date('date')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index('candidate_id');
            $table->index('other_candidate_id');
            $table->index('created_at');
            $table->index(['candidate_id', 'date']);
        });
    }

    public function test_other_list_indexes_are_added_idempotently_and_removed_by_rollback(): void
    {
        $migration = require database_path('migrations/2026_11_14_120100_add_indexes_for_other_list_queries.php');

        $migration->up();
        $migration->up();

        $indexes = [
            ['users', 'users_created_at_index'],
            ['user_interests', 'user_interests_user_created_index'],
            ['candidate_notifications', 'candidate_notifications_user_read_created_index'],
            ['payment_screenshots', 'payment_screenshots_created_at_index'],
            ['payment_screenshots', 'payment_screenshots_profile_created_index'],
            ['profile_melava_registrations', 'profile_melava_created_at_index'],
            ['profile_melava_registrations', 'profile_melava_payment_created_index'],
            ['profile_melava_registrations', 'profile_melava_booklet_created_index'],
            ['profile_melava_registrations', 'profile_melava_campaign_created_index'],
            ['workshop_registrations', 'workshop_registrations_status_created_index'],
            ['melava_campaigns', 'melava_campaigns_status_id_index'],
            ['activity_logs', 'activity_logs_action_created_index'],
            ['activity_logs', 'activity_logs_module_created_index'],
            ['meetings', 'meetings_candidate_created_index'],
            ['meetings', 'meetings_other_candidate_created_index'],
        ];

        foreach ($indexes as [$table, $index]) {
            $this->assertTrue(Schema::hasIndex($table, $index), "{$table}.{$index} was not created.");
        }

        $migration->down();

        foreach ($indexes as [$table, $index]) {
            $this->assertFalse(Schema::hasIndex($table, $index), "{$table}.{$index} was not removed.");
        }
    }
}
