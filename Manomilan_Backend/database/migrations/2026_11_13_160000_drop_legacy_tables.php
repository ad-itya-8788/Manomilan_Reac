
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = [
        'legacy_download_book_exports',
        'legacy_jobs',
        'legacy_melava_registrations',
        'legacy_profiles',
        'legacy_quick_candidate_booklet_details',
        'legacy_users',
        'legacy_workshop_registrations',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::dropIfExists($table);
        }
    }

    public function down(): void
    {
        throw new \RuntimeException(
            'Legacy data tables were dropped. Restore them from a database backup before rolling back this migration.'
        );
    }
};
