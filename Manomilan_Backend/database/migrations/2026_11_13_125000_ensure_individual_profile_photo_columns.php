<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            foreach ([
                'profile_photo',
                'full_body_photo',
                'half_body_photo',
                'selfie_photo',
            ] as $column) {
                if (! Schema::hasColumn('profiles', $column)) {
                    $table->string($column)->nullable();
                }
            }

            if (! Schema::hasColumn('profiles', 'candidate_photos')) {
                $table->json('candidate_photos')->nullable();
            }
        });
    }

    public function down(): void
    {
        // The columns are required by the current profile schema.
    }
};
