<?php

namespace App\Chat\Controllers;

use App\Chat\Models\ChatConversation;
use App\Chat\Models\ChatMessage;
use App\Chat\Requests\SendChatMessageRequest;
use App\Chat\Services\ChatAttachmentService;
use App\Chat\Services\ChatService;
use App\Chat\Services\ChatSettingsService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminChatController extends Controller
{
    private const SAFE_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv',
    ];

    public function __construct(
        private readonly ChatService $chat,
        private readonly ChatAttachmentService $attachments,
        private readonly ChatSettingsService $settings
    ) {
    }

    public function index(Request $request)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'view');

        $conversations = $this->chat->conversations([
            'status' => $request->input('status'),
            'search' => $request->input('search'),
        ], (int) $request->input('per_page', 20));

        $conversations->getCollection()->transform(
            fn (ChatConversation $conversation) => $this->chat->conversationPayload($conversation)
        );

        return response()->json([
            'success' => true,
            'data' => $conversations,
            'meta' => ['unread_count' => $this->chat->unreadForAdmin()],
        ]);
    }

    public function show(Request $request, ChatConversation $conversation)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'view');
        abort_if($conversation->status === 'deleted', 404);

        $this->chat->markRead($conversation, 'admin');

        $conversation->load(['user:id,name,username,email,profile_id', 'assignedAdmin:id,name']);
        $messages = $this->chat->messages(
            $conversation->id,
            null,
            null,
            (int) $request->input('limit', config('chat.message_page_size', 30))
        );

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $this->chat->conversationPayload($conversation),
                'messages' => $messages->map(fn (ChatMessage $message) => $this->chat->messagePayload($message, $request->user()->id, true))->values(),
                'has_more' => $messages->count() >= (int) config('chat.message_page_size', 30),
            ],
        ]);
    }

    public function messages(Request $request, ChatConversation $conversation)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'view');
        abort_if($conversation->status === 'deleted', 404);

        $afterId = $request->filled('after_id') ? (int) $request->input('after_id') : null;
        $beforeId = $request->filled('before_id') ? (int) $request->input('before_id') : null;
        $limit = (int) $request->input('limit', config('chat.message_page_size', 30));

        if (! $afterId) {
            $this->chat->markRead($conversation, 'admin');
        }

        $messages = $this->chat->messages($conversation->id, $afterId, $beforeId, $limit);

        return response()->json([
            'success' => true,
            'data' => [
                'messages' => $messages->map(fn (ChatMessage $message) => $this->chat->messagePayload($message, $request->user()->id, true))->values(),
                'has_more' => ! $afterId && $messages->count() >= $limit,
            ],
        ]);
    }

    public function send(SendChatMessageRequest $request, ChatConversation $conversation)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'create');
        abort_if($conversation->status === 'deleted', 404);

        if (! $conversation->assigned_admin_id) {
            $conversation->assigned_admin_id = $request->user()->id;
            $conversation->save();
        }

        $message = $this->chat->send(
            $conversation,
            $request->user(),
            $request->input('message'),
            $request->file('attachment'),
            ChatMessage::SENDER_ADMIN
        );

        $this->chat->markRead($conversation, 'admin');

        return response()->json([
            'success' => true,
            'data' => $this->chat->messagePayload($message, $request->user()->id, true),
        ], 201);
    }

    public function read(Request $request, ChatConversation $conversation)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'edit');
        abort_if($conversation->status === 'deleted', 404);

        $this->chat->markRead($conversation, 'admin');

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $this->chat->unreadForAdmin()],
        ]);
    }

    public function updateStatus(Request $request, ChatConversation $conversation)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'edit');
        abort_if($conversation->status === 'deleted', 404);

        $data = $request->validate([
            'status' => ['required', 'in:open,closed'],
        ]);

        $conversation->update(['status' => $data['status']]);

        return response()->json([
            'success' => true,
            'message' => $data['status'] === 'closed' ? 'Conversation closed.' : 'Conversation reopened.',
            'data' => $this->chat->conversationPayload($conversation->load('user', 'assignedAdmin', 'latestMessage')),
        ]);
    }

    public function destroy(Request $request, ChatConversation $conversation)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'delete');
        $this->requirePermission($request->user(), 'chat_delete', 'delete');

        $conversation->messages()
            ->whereNotNull('attachment_path')
            ->select(['id', 'attachment_path'])
            ->chunkById(200, function ($messages) {
                foreach ($messages as $message) {
                    $this->attachments->delete($message->attachment_path);
                }
            });

        $conversation->messages()->update([
            'is_deleted' => true,
            'attachment_path' => null,
            'updated_at' => now(),
        ]);
        $conversation->update(['status' => 'deleted']);

        return response()->json(['success' => true, 'message' => 'Conversation deleted.']);
    }

    public function destroyMessage(Request $request, ChatMessage $message)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'delete');
        $this->requirePermission($request->user(), 'chat_delete', 'delete');
        abort_if(! $message->conversation_id, 404);

        $this->attachments->delete($message->attachment_path);
        $message->update([
            'is_deleted' => true,
            'message' => null,
            'attachment_path' => null,
            'attachment_name' => null,
            'attachment_type' => null,
            'attachment_size' => null,
        ]);

        return response()->json(['success' => true, 'message' => 'Message deleted.']);
    }

    public function unreadCount(Request $request)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'view');

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $this->chat->unreadForAdmin()],
        ]);
    }

    public function faqs(Request $request)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_faq_management', 'manage');

        return response()->json(['success' => true, 'data' => $this->chat->faqs()]);
    }

    public function storeFaq(Request $request)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_faq_management', 'manage');

        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string', 'max:5000'],
        ]);

        $faq = $this->chat->createFaq($data['question'], $data['answer']);

        return response()->json([
            'success' => true,
            'data' => $this->chat->faqPayload($faq),
        ], 201);
    }

    public function updateFaq(Request $request, ChatMessage $faq)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_faq_management', 'manage');
        abort_unless($faq->sender_type === ChatMessage::SENDER_FAQ && ! $faq->conversation_id, 404);

        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string', 'max:5000'],
        ]);

        $faq = $this->chat->updateFaq($faq, $data['question'], $data['answer']);

        return response()->json([
            'success' => true,
            'data' => $this->chat->faqPayload($faq),
        ]);
    }

    public function destroyFaq(Request $request, ChatMessage $faq)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_faq_management', 'manage');
        abort_unless($faq->sender_type === ChatMessage::SENDER_FAQ && ! $faq->conversation_id, 404);

        $faq->update(['is_deleted' => true]);

        return response()->json(['success' => true, 'message' => 'FAQ deleted.']);
    }

    public function settings(Request $request)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_settings', 'manage');

        return response()->json(['success' => true, 'data' => $this->settings->get()]);
    }

    public function updateSettings(Request $request)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_settings', 'manage');

        $data = $request->validate([
            'help_chat_enabled' => ['sometimes', 'boolean'],
            'ai_chatbot_enabled' => ['sometimes', 'boolean'],
            'contact_admin_enabled' => ['sometimes', 'boolean'],
            'admin_available' => ['sometimes', 'boolean'],
            'admin_contact_number' => ['sometimes', 'nullable', 'string', 'regex:/^\+?[1-9]\d{7,14}$/'],
            'faq_bot_enabled' => ['sometimes', 'boolean'],
            'max_attachment_kb' => ['sometimes', 'integer', 'min:512', 'max:51200'],
            'allowed_extensions' => ['sometimes', 'array', 'min:1'],
            'allowed_extensions.*' => ['string', 'in:'.implode(',', self::SAFE_EXTENSIONS)],
        ]);
        if (array_key_exists('faq_bot_enabled', $data) && ! array_key_exists('ai_chatbot_enabled', $data)) {
            $data['ai_chatbot_enabled'] = $data['faq_bot_enabled'];
        }
        unset($data['faq_bot_enabled']);

        return response()->json([
            'success' => true,
            'message' => 'Chat settings saved.',
            'data' => $this->settings->update($data),
        ]);
    }

    public function attachment(Request $request, ChatMessage $message)
    {
        $this->requireAdmin($request);
        $this->requirePermission($request->user(), 'chat_support', 'export');
        abort_if($message->is_deleted || ! $message->attachment_path, 404);

        return $this->attachments->response($message, $request->boolean('download'));
    }

    private function requireAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Forbidden.');
    }

    private function requirePermission(User $user, string $module, string $action): void
    {
        abort_unless($user->hasModulePermission($module, $action), 403, 'Forbidden.');
    }
}
