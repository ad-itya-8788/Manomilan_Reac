<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('website_settings', 'chat_settings')) {
            Schema::table('website_settings', function (Blueprint $table): void {
                $table->json('chat_settings')->nullable();
            });
        }

        if (! Schema::hasColumn('chat_conversations', 'guest_name')) {
            Schema::table('chat_conversations', function (Blueprint $table): void {
                $table->string('guest_name', 120)->nullable();
                $table->string('guest_email', 255)->nullable();
                $table->string('guest_token_hash', 64)->nullable()->unique('chat_conversations_guest_token_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('chat_conversations', 'guest_token_hash')) {
            Schema::table('chat_conversations', function (Blueprint $table): void {
                $table->dropUnique('chat_conversations_guest_token_unique');
                $table->dropColumn(['guest_name', 'guest_email', 'guest_token_hash']);
            });
        }

        if (Schema::hasColumn('website_settings', 'chat_settings')) {
            Schema::table('website_settings', function (Blueprint $table): void {
                $table->dropColumn('chat_settings');
            });
        }
    }
};
