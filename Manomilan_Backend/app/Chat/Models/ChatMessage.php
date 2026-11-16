<?php

namespace App\Chat\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    protected $table = 'chat_messages';

    public const SENDER_USER = 'user';
    public const SENDER_ADMIN = 'admin';
    public const SENDER_SYSTEM = 'system';
    public const SENDER_FAQ = 'faq';

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'sender_type',
        'message',
        'attachment_path',
        'attachment_name',
        'attachment_type',
        'attachment_size',
        'is_read',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'is_deleted' => 'boolean',
            'attachment_size' => 'integer',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function scopeFaq(Builder $query): Builder
    {
        return $query->whereNull('conversation_id')
            ->where('sender_type', self::SENDER_FAQ)
            ->where('is_deleted', false);
    }
}
