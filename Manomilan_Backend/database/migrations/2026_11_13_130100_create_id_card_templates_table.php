<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('id_card_templates')) {
            Schema::create('id_card_templates', function (Blueprint $table): void {
                $table->id();
                $table->string('slug', 50)->unique();
                $table->string('name', 100)->default('Default ID Card');
                $table->json('settings')->nullable();
                $table->unsignedBigInteger('created_by_user_id')->nullable();
                $table->unsignedBigInteger('updated_by_user_id')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('id_card_templates');
    }
};
