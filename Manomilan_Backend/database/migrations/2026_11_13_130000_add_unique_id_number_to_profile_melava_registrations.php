<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('profile_melava_registrations', 'unique_id_number')) {
            Schema::table('profile_melava_registrations', function (Blueprint $table): void {
                $table->string('unique_id_number', 50)->nullable()->default(null)->after('melava_campaign_id');
            });
        }

        $indexes = collect(DB::select('SHOW INDEX FROM profile_melava_registrations'))
            ->pluck('Key_name')
            ->all();

        if (! in_array('profile_melava_registrations_unique_id_number_unique', $indexes, true)) {
            Schema::table('profile_melava_registrations', function (Blueprint $table): void {
                $table->unique('unique_id_number', 'profile_melava_registrations_unique_id_number_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('profile_melava_registrations', 'unique_id_number')) {
            Schema::table('profile_melava_registrations', function (Blueprint $table): void {
                $table->dropUnique('profile_melava_registrations_unique_id_number_unique');
                $table->dropColumn('unique_id_number');
            });
        }
    }
};
