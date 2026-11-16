<?php

namespace App\Chat\Services;

use App\Chat\Models\ChatConversation;
use App\Chat\Models\ChatMessage;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChatService
{
    public function __construct(private readonly ChatAttachmentService $attachments)
    {
    }

    public function conversationForUser(User $user, bool $create = true): ?ChatConversation
    {
        $conversation = ChatConversation::query()
            ->where('user_id', $user->id)
            ->where('status', '!=', 'deleted')
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->first();

        if (! $conversation && $create) {
            $conversation = ChatConversation::query()->create([
                'user_id' => $user->id,
                'status' => 'open',
            ]);
        }

        return $conversation;
    }

    public function send(
        ChatConversation $conversation,
        ?User $sender,
        ?string $text,
        ?UploadedFile $file,
        string $senderType
    ): ChatMessage {
        $text = trim((string) $text);
        if ($text === '' && ! $file) {
            throw ValidationException::withMessages([
                'message' => ['Please type a message or attach a file.'],
            ]);
        }

        $attachment = $file ? $this->attachments->store($file) : [];

        try {
            return DB::transaction(function () use ($conversation, $sender, $text, $senderType, $attachment) {
                $message = ChatMessage::query()->create(array_merge([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $sender?->id,
                    'sender_type' => $senderType,
                    'message' => $text !== '' ? $text : null,
                    'is_read' => false,
                    'is_deleted' => false,
                ], $attachment));

                $conversation->forceFill([
                    'last_message_at' => $message->created_at,
                    'status' => $conversation->status === 'closed' ? 'open' : $conversation->status,
                ])->save();

                return $message->load('sender:id,name,username');
            });
        } catch (\Throwable $exception) {
            $this->attachments->delete($attachment['attachment_path'] ?? null);
            throw $exception;
        }
    }

    public function messages(
        int $conversationId,
        ?int $afterId = null,
        ?int $beforeId = null,
        int $limit = 30
    ): Collection {
        $limit = max(1, min(100, $limit));
        $query = ChatMessage::query()
            ->where('conversation_id', $conversationId)
            ->where('is_deleted', false)
            ->with('sender:id,name,username');

        if ($afterId) {
            return $query->where('id', '>', $afterId)
                ->orderBy('id')
                ->limit($limit)
                ->get();
        }

        if ($beforeId) {
            return $query->where('id', '<', $beforeId)
                ->orderByDesc('id')
                ->limit($limit)
                ->get()
                ->reverse()
                ->values();
        }

        return $query->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();
    }

    public function markRead(ChatConversation $conversation, string $readerType): int
    {
        $query = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('is_read', false);

        $query->where('sender_type', $readerType === 'admin' ? 'user' : 'admin');

        return $query->update(['is_read' => true, 'updated_at' => now()]);
    }

    public function unreadForUser(User $user): int
    {
        return ChatMessage::query()
            ->whereHas('conversation', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('status', '!=', 'deleted'))
            ->where('sender_type', 'admin')
            ->where('is_read', false)
            ->where('is_deleted', false)
            ->count();
    }

    public function unreadForAdmin(): int
    {
        return ChatMessage::query()
            ->whereHas('conversation', fn ($query) => $query->where('status', '!=', 'deleted'))
            ->where('sender_type', 'user')
            ->where('is_read', false)
            ->where('is_deleted', false)
            ->count();
    }

    public function conversations(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $status = (string) ($filters['status'] ?? '');
        $search = trim((string) ($filters['search'] ?? ''));

        return ChatConversation::query()
            ->where('status', '!=', 'deleted')
            ->when(in_array($status, ['open', 'closed'], true), fn ($query) => $query->where('status', $status))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->whereHas('user', fn ($user) => $user
                            ->where('name', 'like', '%'.$search.'%')
                            ->orWhere('username', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%'))
                        ->orWhere('guest_name', 'like', '%'.$search.'%')
                        ->orWhere('guest_mobile', 'like', '%'.$search.'%')
                        ->orWhere('guest_email', 'like', '%'.$search.'%');
                });
            })
            ->with([
                'user:id,name,username,email,profile_id',
                'assignedAdmin:id,name',
                'latestMessage',
            ])
            ->withCount(['messages as unread_count' => fn ($query) => $query
                ->where('sender_type', 'user')
                ->where('is_read', false)
                ->where('is_deleted', false)])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate(max(1, min(50, $perPage)));
    }

    public function conversationPayload(ChatConversation $conversation): array
    {
        $lastMessage = $conversation->relationLoaded('latestMessage')
            ? $conversation->latestMessage
            : $conversation->latestMessage()->first();

        return [
            'id' => $conversation->id,
            'status' => $conversation->status,
            'user' => $conversation->user ? [
                'id' => $conversation->user->id,
                'name' => $conversation->user->name,
                'username' => $conversation->user->username,
                'email' => $conversation->user->email,
                'profile_id' => $conversation->user->profile_id,
            ] : ($conversation->guest_token_hash ? [
                'id' => null,
                'name' => $conversation->guest_name ?: 'Website visitor',
                'username' => 'Guest visitor',
                'mobile' => $conversation->guest_mobile,
                'email' => $conversation->guest_email,
                'profile_id' => null,
            ] : null),
            'assigned_admin' => $conversation->assignedAdmin ? [
                'id' => $conversation->assignedAdmin->id,
                'name' => $conversation->assignedAdmin->name,
            ] : null,
            'unread_count' => (int) ($conversation->unread_count ?? 0),
            'last_message_at' => $conversation->last_message_at,
            'last_message' => $lastMessage ? [
                'id' => $lastMessage->id,
                'message' => $lastMessage->is_deleted ? null : $lastMessage->message,
                'sender_type' => $lastMessage->sender_type,
                'attachment_name' => $lastMessage->attachment_name,
                'created_at' => $lastMessage->created_at,
            ] : null,
            'created_at' => $conversation->created_at,
        ];
    }

    public function messagePayload(
        ChatMessage $message,
        int $viewerId,
        bool $admin = false,
        bool $publicGuest = false
    ): array
    {
        $hasAttachment = ! $message->is_deleted
            && $message->attachment_path
            && $message->attachment_name;
        $attachmentBase = $admin
            ? '/admin/chat/attachments/'
            : ($publicGuest ? '/chat/public/attachments/' : '/chat/attachments/');

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'sender_type' => $message->sender_type,
            'sender_name' => $message->sender?->name ?: ($message->sender_type === 'admin'
                ? 'Support'
                : ($message->sender_id === null ? 'Website visitor' : 'You')),
            'message' => $message->is_deleted ? null : $message->message,
            'is_read' => (bool) $message->is_read,
            'is_deleted' => (bool) $message->is_deleted,
            'mine' => (int) $message->sender_id === $viewerId,
            'attachment' => $hasAttachment ? [
                'name' => $message->attachment_name,
                'type' => $message->attachment_type,
                'size' => (int) $message->attachment_size,
                'is_image' => str_starts_with((string) $message->attachment_type, 'image/'),
                'public_guest' => $publicGuest,
                'url' => $attachmentBase.$message->id,
                'download_url' => $attachmentBase.$message->id.'?download=1',
            ] : null,
            'created_at' => $message->created_at,
        ];
    }

    public function faqs(): Collection
    {
        return ChatMessage::query()
            ->faq()
            ->orderBy('id')
            ->get()
            ->map(fn (ChatMessage $message) => $this->faqPayload($message))
            ->values();
    }

    public function createFaq(string $question, string $answer): ChatMessage
    {
        return ChatMessage::query()->create([
            'conversation_id' => null,
            'sender_id' => null,
            'sender_type' => ChatMessage::SENDER_FAQ,
            'message' => json_encode(['question' => $question, 'answer' => $answer], JSON_UNESCAPED_UNICODE),
            'is_read' => true,
            'is_deleted' => false,
        ]);
    }

    public function updateFaq(ChatMessage $faq, string $question, string $answer): ChatMessage
    {
        $faq->update([
            'message' => json_encode(['question' => $question, 'answer' => $answer], JSON_UNESCAPED_UNICODE),
        ]);

        return $faq->refresh();
    }

    public function faqPayload(ChatMessage $message): array
    {
        $decoded = json_decode((string) $message->message, true);
        if (! is_array($decoded)) {
            $decoded = ['question' => (string) $message->message, 'answer' => ''];
        }

        return [
            'id' => $message->id,
            'question' => (string) ($decoded['question'] ?? ''),
            'answer' => (string) ($decoded['answer'] ?? ''),
            'created_at' => $message->created_at,
        ];
    }
}
