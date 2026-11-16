<?php

use App\Chat\Controllers\AdminChatController;
use App\Chat\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:60,1')->group(function () {
    Route::get('/chat/faqs', [ChatController::class, 'publicFaqs']);
});

Route::prefix('chat/public')->middleware('throttle:30,1')->group(function () {
    Route::post('/conversations', [ChatController::class, 'startPublicConversation']);
    Route::get('/conversations/{conversation}/messages', [ChatController::class, 'publicMessages'])->whereNumber('conversation');
    Route::post('/conversations/{conversation}/messages', [ChatController::class, 'sendPublicMessage'])->whereNumber('conversation');
    Route::post('/conversations/{conversation}/read', [ChatController::class, 'readPublicConversation'])->whereNumber('conversation');
    Route::get('/attachments/{message}', [ChatController::class, 'publicAttachment'])->whereNumber('message');
});

Route::middleware(['auth.api-token', 'rbac.api'])->group(function () {
    Route::prefix('chat')->group(function () {
        Route::get('/bootstrap', [ChatController::class, 'bootstrap']);
        Route::get('/messages', [ChatController::class, 'messages']);
        Route::post('/messages', [ChatController::class, 'send']);
        Route::post('/read', [ChatController::class, 'read']);
        Route::get('/unread-count', [ChatController::class, 'unreadCount']);
        Route::get('/attachments/{message}', [ChatController::class, 'attachment'])->whereNumber('message');
    });

    Route::prefix('admin/chat')->group(function () {
        Route::get('/conversations', [AdminChatController::class, 'index']);
        Route::get('/conversations/{conversation}', [AdminChatController::class, 'show'])->whereNumber('conversation');
        Route::get('/conversations/{conversation}/messages', [AdminChatController::class, 'messages'])->whereNumber('conversation');
        Route::post('/conversations/{conversation}/messages', [AdminChatController::class, 'send'])->whereNumber('conversation');
        Route::post('/conversations/{conversation}/read', [AdminChatController::class, 'read'])->whereNumber('conversation');
        Route::patch('/conversations/{conversation}/status', [AdminChatController::class, 'updateStatus'])->whereNumber('conversation');
        Route::delete('/conversations/{conversation}', [AdminChatController::class, 'destroy'])->whereNumber('conversation');
        Route::delete('/messages/{message}', [AdminChatController::class, 'destroyMessage'])->whereNumber('message');
        Route::get('/unread-count', [AdminChatController::class, 'unreadCount']);
        Route::get('/attachments/{message}', [AdminChatController::class, 'attachment'])->whereNumber('message');

        Route::get('/faqs', [AdminChatController::class, 'faqs']);
        Route::post('/faqs', [AdminChatController::class, 'storeFaq']);
        Route::put('/faqs/{faq}', [AdminChatController::class, 'updateFaq'])->whereNumber('faq');
        Route::delete('/faqs/{faq}', [AdminChatController::class, 'destroyFaq'])->whereNumber('faq');

        Route::get('/settings', [AdminChatController::class, 'settings']);
        Route::put('/settings', [AdminChatController::class, 'updateSettings']);
    });
});
