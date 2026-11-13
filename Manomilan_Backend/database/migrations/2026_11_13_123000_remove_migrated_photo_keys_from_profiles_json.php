<?php

use Illuminate\Database\Migrations\Migration;
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
        if (! Schema::hasColumn('profiles', 'photos')) {
            return;
        }

        foreach (self::PHOTO_COLUMNS as $column) {
            if (! Schema::hasColumn('profiles', $column)) {
                throw new RuntimeException("Required column profiles.{$column} does not exist.");
            }
        }

        DB::table('profiles')
            ->select(['id', 'photos', ...self::PHOTO_COLUMNS])
            ->whereNotNull('photos')
            ->chunkById(500, function ($profiles): void {
                foreach ($profiles as $profile) {
                    $photos = json_decode((string) $profile->photos, true);
                    if (! is_array($photos)) {
                        continue;
                    }

                    foreach (self::PHOTO_COLUMNS as $column) {
                        $value = $photos[$column] ?? null;
                        if (
                            is_string($value)
                            && trim($value) !== ''
                            && (string) $profile->{$column} !== trim($value)
                        ) {
                            throw new RuntimeException(
                                "Photo migration verification failed for profile {$profile->id}, {$column}."
                            );
                        }
                        unset($photos[$column]);
                    }

                    DB::table('profiles')
                        ->where('id', $profile->id)
                        ->update(['photos' => $photos ?: null]);
                }
            });
    }

    public function down(): void
    {
        // The four paths remain available in their dedicated columns.
    }
};
