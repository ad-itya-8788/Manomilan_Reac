<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_token_sessions', function (Blueprint $table): void {
            $table->char('token_hash', 64)->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
            $table->index('expires_at', 'api_token_sessions_expires_at_index');
            $table->index(['user_id', 'expires_at'], 'api_token_sessions_user_expiry_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_token_sessions');
    }
};
