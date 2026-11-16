<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_conversations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('assigned_admin_id')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index('user_id', 'chat_conversations_user_index');
            $table->index('assigned_admin_id', 'chat_conversations_admin_index');
            $table->index(['status', 'last_message_at'], 'chat_conversations_status_last_index');

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('assigned_admin_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('chat_messages', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('conversation_id')->nullable();
            $table->unsignedBigInteger('sender_id')->nullable();
            $table->string('sender_type', 20)->default('user');
            $table->longText('message')->nullable();
            $table->string('attachment_path', 500)->nullable();
            $table->string('attachment_name', 255)->nullable();
            $table->string('attachment_type', 120)->nullable();
            $table->unsignedBigInteger('attachment_size')->nullable();
            $table->boolean('is_read')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();

            $table->index(['conversation_id', 'id'], 'chat_messages_conversation_id_index');
            $table->index(['conversation_id', 'is_read'], 'chat_messages_conversation_read_index');
            $table->index(['conversation_id', 'is_deleted'], 'chat_messages_conversation_deleted_index');
            $table->index('sender_id', 'chat_messages_sender_index');

            $table->foreign('conversation_id')->references('id')->on('chat_conversations')->nullOnDelete();
            $table->foreign('sender_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_conversations');
    }
};
