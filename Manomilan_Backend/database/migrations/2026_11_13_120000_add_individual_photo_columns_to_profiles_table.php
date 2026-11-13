<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PHOTO_COLUMNS = [
        'profile_photo',
        'full_body_photo',
        'half_body_photo',
        'selfie_photo',
    ];

    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            foreach (self::PHOTO_COLUMNS as $column) {
                if (! Schema::hasColumn('profiles', $column)) {
                    $table->string($column)->nullable();
                }
            }
        });

        if (! Schema::hasColumn('profiles', 'photos')) {
            return;
        }

        DB::table('profiles')
            ->select(array_merge(['id', 'photos'], self::PHOTO_COLUMNS))
            ->whereNotNull('photos')
            ->chunkById(500, function ($profiles): void {
                foreach ($profiles as $profile) {
                    $photos = is_array($profile->photos)
                        ? $profile->photos
                        : json_decode((string) $profile->photos, true);

                    if (! is_array($photos)) {
                        continue;
                    }

                    $updates = [];
                    foreach (self::PHOTO_COLUMNS as $column) {
                        if ($profile->{$column} !== null) {
                            continue;
                        }

                        $value = $photos[$column] ?? null;
                        if (is_string($value) && trim($value) !== '') {
                            $updates[$column] = trim($value);
                        }
                    }

                    if ($updates) {
                        DB::table('profiles')
                            ->where('id', $profile->id)
                            ->update($updates);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            foreach (self::PHOTO_COLUMNS as $column) {
                if (Schema::hasColumn('profiles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
