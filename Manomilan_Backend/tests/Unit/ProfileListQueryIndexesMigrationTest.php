<?php

namespace Tests\Unit;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProfileListQueryIndexesMigrationTest extends TestCase
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

        Schema::create('profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('status');
            $table->timestamp('created_at')->nullable();
            $table->string('reg_id')->nullable();
            $table->string('verification_status')->nullable();
            $table->string('groomorbride')->nullable();
            $table->date('birth_date')->nullable();
        });

        Schema::create('profile_melava_registrations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id');
            $table->boolean('payment_verified')->default(false);
        });
    }

    public function test_profile_list_indexes_are_added_idempotently_and_removed_by_rollback(): void
    {
        $migration = require database_path('migrations/2026_11_14_120000_add_profile_list_query_indexes.php');

        $migration->up();
        $migration->up();

        $this->assertTrue(Schema::hasIndex('profiles', 'profiles_status_created_at_index'));
        $this->assertTrue(Schema::hasIndex('profiles', 'profiles_status_reg_id_index'));
        $this->assertTrue(Schema::hasIndex('profiles', 'profiles_status_verification_created_index'));
        $this->assertTrue(Schema::hasIndex('profiles', 'profiles_status_gender_created_index'));
        $this->assertTrue(Schema::hasIndex('profiles', 'profiles_status_birth_date_index'));
        $this->assertTrue(Schema::hasIndex('profile_melava_registrations', 'profile_melava_profile_payment_index'));

        $migration->down();

        $this->assertFalse(Schema::hasIndex('profiles', 'profiles_status_created_at_index'));
        $this->assertFalse(Schema::hasIndex('profile_melava_registrations', 'profile_melava_profile_payment_index'));
    }
}
