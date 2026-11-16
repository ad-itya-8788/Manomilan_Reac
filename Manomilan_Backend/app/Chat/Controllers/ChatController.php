<?php

namespace App\Chat\Controllers;

use App\Chat\Models\ChatConversation;
use App\Chat\Models\ChatMessage;
use App\Chat\Requests\SendChatMessageRequest;
use App\Chat\Services\ChatAttachmentService;
use App\Chat\Services\ChatService;
use App\Chat\Services\ChatSettingsService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function __construct(
        private readonly ChatService $chat,
        private readonly ChatAttachmentService $attachments,
        private readonly ChatSettingsService $settings
    ) {
    }

    public function bootstrap(Request $request)
    {
        $user = $request->user();
        abort_unless($user->portal() === 'candidate', 403);

        $conversation = $this->chat->conversationForUser($user);
        $messages = $conversation
            ? $this->chat->messages($conversation->id, null, null, (int) config('chat.message_page_size', 30))
            : collect();
        $settings = $this->settings->get();

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $conversation ? $this->chat->conversationPayload($conversation) : null,
                'messages' => $messages->map(fn (ChatMessage $message) => $this->chat->messagePayload($message, $user->id))->values(),
                'unread_count' => $this->chat->unreadForUser($user),
                'faqs' => $settings['ai_chatbot_enabled'] ? $this->chat->faqs() : [],
                'settings' => [
                    'ai_chatbot_enabled' => $settings['ai_chatbot_enabled'],
                    'max_attachment_kb' => $settings['max_attachment_kb'],
                    'allowed_extensions' => $settings['allowed_extensions'],
                ],
            ],
        ]);
    }

    public function messages(Request $request)
    {
        $user = $request->user();
        abort_unless($user->portal() === 'candidate', 403);

        $conversation = $this->chat->conversationForUser($user, false);
        if (! $conversation) {
            return response()->json(['success' => true, 'data' => ['messages' => [], 'has_more' => false]]);
        }

        $afterId = $request->filled('after_id') ? (int) $request->input('after_id') : null;
        $beforeId = $request->filled('before_id') ? (int) $request->input('before_id') : null;
        $limit = (int) $request->input('limit', config('chat.message_page_size', 30));

        $messages = $this->chat->messages($conversation->id, $afterId, $beforeId, $limit);

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $this->chat->conversationPayload($conversation),
                'messages' => $messages->map(fn (ChatMessage $message) => $this->chat->messagePayload($message, $user->id))->values(),
                'has_more' => ! $afterId && $messages->count() >= $limit,
            ],
        ]);
    }

    public function send(SendChatMessageRequest $request)
    {
        $user = $request->user();
        abort_unless($user->portal() === 'candidate', 403);

        $conversation = $this->chat->conversationForUser($user);
        $message = $this->chat->send(
            $conversation,
            $user,
            $request->input('message'),
            $request->file('attachment'),
            ChatMessage::SENDER_USER
        );

        return response()->json([
            'success' => true,
            'data' => $this->chat->messagePayload($message, $user->id),
        ], 201);
    }

    public function read(Request $request)
    {
        $user = $request->user();
        abort_unless($user->portal() === 'candidate', 403);

        $conversation = $this->chat->conversationForUser($user, false);
        if ($conversation) {
            $this->chat->markRead($conversation, 'user');
        }

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $this->chat->unreadForUser($user)],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $user->isAdmin()
                ? $this->chat->unreadForAdmin()
                : $this->chat->unreadForUser($user)],
        ]);
    }

    public function attachment(Request $request, ChatMessage $message)
    {
        $user = $request->user();
        $conversation = $message->conversation;

        $isOwner = $conversation && (int) $conversation->user_id === (int) $user->id;
        $isAdmin = $user->isAdmin();
        abort_unless($isOwner || $isAdmin, 403);

        $module = $isAdmin ? 'chat_support' : 'candidate_chat';
        abort_unless($user->hasModulePermission($module, 'export'), 403, 'Forbidden.');
        abort_if($message->is_deleted || ! $message->attachment_path, 404);

        return $this->attachments->response($message, $request->boolean('download'));
    }

    public function publicFaqs()
    {
        $settings = $this->settings->get();
        $chatEnabled = $settings['help_chat_enabled'];
        $aiEnabled = $chatEnabled && $settings['ai_chatbot_enabled'];

        return response()->json([
            'success' => true,
            'data' => [
                'faqs' => $aiEnabled ? $this->chat->faqs() : [],
                'help_chat_enabled' => $chatEnabled,
                'ai_chatbot_enabled' => $settings['ai_chatbot_enabled'],
                'faq_bot_enabled' => $settings['ai_chatbot_enabled'],
                'contact_admin_enabled' => $chatEnabled && $settings['contact_admin_enabled'],
                'admin_available' => $settings['admin_available'],
                'admin_contact_number' => $chatEnabled && $settings['contact_admin_enabled']
                    ? $settings['admin_contact_number']
                    : '',
                'max_attachment_kb' => $settings['max_attachment_kb'],
                'allowed_extensions' => $settings['allowed_extensions'],
            ],
        ]);
    }

    public function startPublicConversation(Request $request)
    {
        $settings = $this->settings->get();
        abort_unless(
            $settings['help_chat_enabled'] && $settings['contact_admin_enabled'],
            404,
            'Live admin chat is unavailable.'
        );
        abort_unless($settings['admin_available'], 409, 'Admin is currently not available.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'mobile' => ['required', 'string', 'size:10', 'regex:/^[0-9]{10}$/'],
            'email' => ['required', 'email', 'max:255'],
        ]);

        $token = (string) $request->header('X-Help-Chat-Token');
        $conversation = $token !== '' && strlen($token) >= 48 && strlen($token) <= 128
            ? ChatConversation::query()
                ->whereNull('user_id')
                ->where('guest_token_hash', hash('sha256', $token))
                ->where('guest_token_expires_at', '>', now())
                ->where('created_at', '>', now()->subHour())
                ->where('status', '!=', 'deleted')
                ->first()
            : null;

        $normalizeName = static fn (?string $name): string => Str::lower(
            preg_replace('/\s+/', ' ', trim((string) $name)) ?? ''
        );
        $normalizeMobile = static fn (?string $mobile): string => preg_replace(
            '/\D+/',
            '',
            (string) $mobile
        ) ?? '';
        $normalizeEmail = static fn (?string $email): string => Str::lower(trim((string) $email));

        if ($conversation && (
            $normalizeName($conversation->guest_name) !== $normalizeName($data['name'])
            || $normalizeMobile($conversation->guest_mobile) !== $normalizeMobile($data['mobile'])
            || $normalizeEmail($conversation->guest_email) !== $normalizeEmail($data['email'])
        )) {
            $conversation = null;
        }

        if (! $conversation) {
            $token = Str::random(64);
            $conversation = ChatConversation::query()->create([
                'guest_name' => trim((string) ($data['name'] ?? '')) ?: 'Website visitor',
                'guest_mobile' => $data['mobile'],
                'guest_email' => $data['email'] ?? null,
                'guest_token_hash' => hash('sha256', $token),
                'guest_token_expires_at' => now()->addMinutes(15),
                'status' => 'open',
            ]);
        } else {
            $conversation->forceFill([
                'guest_token_expires_at' => now()->addMinutes(15),
            ])->save();
        }

        $messages = $this->chat->messages(
            $conversation->id,
            null,
            null,
            (int) config('chat.message_page_size', 30)
        );

        return response()->json([
            'success' => true,
            'data' => [
                'guest_token' => $token,
                'conversation' => $this->chat->conversationPayload($conversation),
                'messages' => $messages->map(
                    fn (ChatMessage $message) => $this->chat->messagePayload($message, 0, false, true)
                )->values(),
                'settings' => [
                    'admin_available' => $settings['admin_available'],
                    'max_attachment_kb' => $settings['max_attachment_kb'],
                    'allowed_extensions' => $settings['allowed_extensions'],
                ],
            ],
        ], 201);
    }

    public function publicMessages(Request $request, ChatConversation $conversation)
    {
        $this->authorizePublicConversation($request, $conversation);
        $settings = $this->settings->get();

        $afterId = $request->filled('after_id') ? (int) $request->input('after_id') : null;
        $beforeId = $request->filled('before_id') ? (int) $request->input('before_id') : null;
        $limit = (int) $request->input('limit', config('chat.message_page_size', 30));
        if (! $afterId) {
            $this->chat->markRead($conversation, 'user');
        }
        $messages = $this->chat->messages($conversation->id, $afterId, $beforeId, $limit);

        return response()->json([
            'success' => true,
            'data' => [
                'messages' => $messages->map(
                    fn (ChatMessage $message) => $this->chat->messagePayload($message, 0, false, true)
                )->values(),
                'has_more' => ! $afterId && $messages->count() >= min(100, max(1, $limit)),
                'admin_available' => $settings['admin_available']
                    && $settings['help_chat_enabled']
                    && $settings['contact_admin_enabled'],
            ],
        ]);
    }

    public function sendPublicMessage(Request $request, ChatConversation $conversation)
    {
        $this->authorizePublicConversation($request, $conversation);
        $settings = $this->settings->get();
        abort_unless(
            $settings['help_chat_enabled'] && $settings['contact_admin_enabled'],
            404,
            'Live admin chat is unavailable.'
        );
        abort_unless($settings['admin_available'], 409, 'Admin is currently not available.');

        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:5000'],
            'attachment' => $this->attachments->rules(),
        ]);
        $messageText = trim((string) ($data['message'] ?? ''));
        if ($messageText === '' && ! $request->hasFile('attachment')) {
            return response()->json([
                'success' => false,
                'message' => 'Please type a message or attach a file.',
                'errors' => ['message' => ['Please type a message or attach a file.']],
            ], 422);
        }

        $message = $this->chat->send(
            $conversation,
            null,
            $messageText,
            $request->file('attachment'),
            ChatMessage::SENDER_USER
        );

        return response()->json([
            'success' => true,
            'data' => $this->chat->messagePayload($message, 0, false, true),
        ], 201);
    }

    public function readPublicConversation(Request $request, ChatConversation $conversation)
    {
        $this->authorizePublicConversation($request, $conversation);
        $this->chat->markRead($conversation, 'user');

        return response()->json(['success' => true, 'data' => ['unread_count' => 0]]);
    }

    public function publicAttachment(Request $request, ChatMessage $message)
    {
        $conversation = $message->conversation;
        abort_unless($conversation, 404);
        $this->authorizePublicConversation($request, $conversation);
        abort_if($message->is_deleted || ! $message->attachment_path, 404);

        return $this->attachments->response($message, $request->boolean('download'));
    }

    private function authorizePublicConversation(Request $request, ChatConversation $conversation): void
    {
        $token = (string) $request->header('X-Help-Chat-Token');
        abort_if(
            $conversation->user_id !== null
                || $conversation->status === 'deleted'
                || ! $conversation->guest_token_hash
                || strlen($token) < 48
                || ! hash_equals($conversation->guest_token_hash, hash('sha256', $token)),
            404
        );

        abort_if(
            ! $conversation->guest_token_expires_at
                || $conversation->guest_token_expires_at->isPast()
                || ! $conversation->created_at
                || $conversation->created_at->lte(now()->subHour()),
            410,
            'This chat session expired. Start a new conversation.'
        );

        if ($conversation->guest_token_expires_at->lte(now()->addMinutes(10))) {
            $conversation->forceFill([
                'guest_token_expires_at' => now()->addMinutes(15),
            ])->save();
        }
    }
}
