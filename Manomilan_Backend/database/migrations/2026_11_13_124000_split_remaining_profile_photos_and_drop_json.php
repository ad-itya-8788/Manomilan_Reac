<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('profiles', 'candidate_photos')) {
            Schema::table('profiles', function (Blueprint $table): void {
                $table->json('candidate_photos')->nullable()->after('additional_photos');
            });
        }

        if (! Schema::hasColumn('profiles', 'photos')) {
            return;
        }

        DB::table('profiles')
            ->select(['id', 'photos', 'additional_photos', 'candidate_photos'])
            ->whereNotNull('photos')
            ->chunkById(500, function ($profiles): void {
                foreach ($profiles as $profile) {
                    $photos = json_decode((string) $profile->photos, true);
                    if (! is_array($photos)) {
                        continue;
                    }

                    $additional = $this->normalizeList($profile->additional_photos);
                    $additional = array_values(array_unique(array_merge(
                        $additional,
                        $this->normalizeList($photos['additional_photos'] ?? $photos['additionalPhotos'] ?? null)
                    )));

                    $candidate = $this->normalizeList($profile->candidate_photos);
                    $candidate = array_values(array_unique(array_merge(
                        $candidate,
                        $this->normalizeList($photos['candidate_photos'] ?? null)
                    )));

                    DB::table('profiles')
                        ->where('id', $profile->id)
                        ->update([
                            'additional_photos' => $additional ?: null,
                            'candidate_photos' => $candidate ?: null,
                        ]);
                }
            });

        Schema::table('profiles', function (Blueprint $table): void {
            if (Schema::hasColumn('profiles', 'photos')) {
                $table->dropColumn('photos');
            }
        });
    }

    private function normalizeList($value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(
                fn ($item) => is_string($item) && trim($item) !== '' ? trim($item) : null,
                $value
            )));
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $this->normalizeList($decoded) : [trim($value)];
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            if (! Schema::hasColumn('profiles', 'photos')) {
                $table->json('photos')->nullable()->after('about_me');
            }
        });
    }
};
