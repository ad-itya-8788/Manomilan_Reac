<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEXES = [
        'profiles' => [
            'profiles_status_created_at_index' => ['status', 'created_at'],
            'profiles_status_reg_id_index' => ['status', 'reg_id'],
            'profiles_status_verification_created_index' => ['status', 'verification_status', 'created_at'],
            'profiles_status_gender_created_index' => ['status', 'groomorbride', 'created_at'],
            'profiles_status_birth_date_index' => ['status', 'birth_date'],
        ],
        'profile_melava_registrations' => [
            'profile_melava_profile_payment_index' => ['profile_id', 'payment_verified'],
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
