<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('profiles', 'additional_photos')) {
            Schema::table('profiles', function (Blueprint $table): void {
                $column = $table->json('additional_photos')->nullable();
                if (Schema::hasColumn('profiles', 'photos')) {
                    $column->after('photos');
                } else {
                    $column->after('about_me');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('profiles', 'additional_photos')) {
            Schema::table('profiles', function (Blueprint $table): void {
                $table->dropColumn('additional_photos');
            });
        }
    }
};
