<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('chat_conversations', 'guest_token_expires_at')) {
            Schema::table('chat_conversations', function (Blueprint $table): void {
                $table->dateTime('guest_token_expires_at')->nullable()->after('guest_token_hash');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('chat_conversations', 'guest_token_expires_at')) {
            Schema::table('chat_conversations', function (Blueprint $table): void {
                $table->dropColumn('guest_token_expires_at');
            });
        }
    }
};
