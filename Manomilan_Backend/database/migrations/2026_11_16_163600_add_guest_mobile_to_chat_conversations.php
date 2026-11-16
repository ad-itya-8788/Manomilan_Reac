<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('chat_conversations', 'guest_mobile')) {
            Schema::table('chat_conversations', function (Blueprint $table): void {
                $table->string('guest_mobile', 16)->nullable()->after('guest_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('chat_conversations', 'guest_mobile')) {
            Schema::table('chat_conversations', function (Blueprint $table): void {
                $table->dropColumn('guest_mobile');
            });
        }
    }
};
