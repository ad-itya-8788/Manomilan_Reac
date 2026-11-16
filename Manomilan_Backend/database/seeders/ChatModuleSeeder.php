<?php

namespace Database\Seeders;

use App\Application;
use App\Chat\Services\ChatService;
use App\Models\ModulePermission;
use App\Module;
use App\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChatModuleSeeder extends Seeder
{
    private const MODULES = [
        'chat_support' => [
            'module_name' => 'Live Chat Support',
            'description' => 'Manage live chat conversations and reply to candidates.',
            'route' => '/admin/chat',
            'frontend_routes' => ['/admin/chat'],
            'api_prefixes' => ['/admin/chat', '/admin/chat/*', '/chat', '/chat/*'],
            'icon' => 'message-circle',
            'sort_order' => 200,
        ],
        'chat_delete' => [
            'module_name' => 'Chat Delete Permissions',
            'description' => 'Delete chat conversations and individual messages.',
            'route' => '/admin/chat',
            'frontend_routes' => ['/admin/chat'],
            'api_prefixes' => [],
            'icon' => 'trash-2',
            'sort_order' => 201,
        ],
        'chat_faq_management' => [
            'module_name' => 'Chat FAQ Management',
            'description' => 'Manage chatbot frequently asked questions.',
            'route' => '/admin/chat',
            'frontend_routes' => ['/admin/chat'],
            'api_prefixes' => [],
            'icon' => 'help-circle',
            'sort_order' => 202,
        ],
        'chat_settings' => [
            'module_name' => 'Help & Support Settings',
            'description' => 'Control the public Help Chat widget, chatbot and admin support availability.',
            'route' => '/admin/chat',
            'frontend_routes' => ['/admin/chat'],
            'api_prefixes' => [],
            'icon' => 'settings',
            'sort_order' => 203,
        ],
        'candidate_chat' => [
            'module_name' => 'Candidate Support Chat',
            'description' => 'Allow candidates to chat with support and upload attachments.',
            'route' => '/candidate/chat',
            'frontend_routes' => ['/candidate/chat'],
            'api_prefixes' => ['/chat', '/chat/*'],
            'icon' => 'message-circle',
            'sort_order' => 204,
        ],
    ];

    private const DEFAULT_FAQS = [
        ['How do I register?', 'Open the registration page, enter your details and submit the form. After registering, sign in to complete your profile and use matchmaking features.'],
        ['How do I create my profile?', 'Sign in to your candidate account, open My Profile and complete each section. Your profile unlocks matching features once it is complete.'],
        ['How can I update my profile?', 'Sign in and open My Profile to edit your information, photos and preferences. Save your changes when you are finished.'],
        ['How do I send an interest?', 'Open Find Matches, view a profile and tap Send Interest. You can review replies under Interests Sent.'],
        ['How are matches selected?', 'Matches are suggested using profile details and partner preferences. Complete your profile and preferences to receive more relevant suggestions.'],
        ['What does profile verification mean?', 'Verification confirms that your submitted profile details and documents have been reviewed by our team.'],
        ['How do I make a payment?', 'Open the relevant registration or payment section, select the available option and follow the on-screen instructions. Contact support if a payment is not reflected.'],
        ['How do I contact support?', 'Use the Help Chat on this page to get an instant answer or contact the support team when it is available.'],
    ];

    public function run(): void
    {
        $application = Application::query()->orderBy('id')->first();
        if (! $application) {
            return;
        }

        DB::transaction(function () use ($application) {
            $modules = [];
            foreach (self::MODULES as $key => $module) {
                $modules[$key] = Module::query()->updateOrCreate(
                    ['module_key' => $key],
                    [
                        'application_id' => $application->id,
                        'module_name' => $module['module_name'],
                        'description' => $module['description'],
                        'status' => true,
                        'route' => $module['route'],
                        'frontend_routes' => $module['frontend_routes'],
                        'api_prefixes' => $module['api_prefixes'],
                        'icon' => $module['icon'],
                        'sort_order' => $module['sort_order'],
                    ]
                );
            }

            $allActions = array_fill_keys(array_values(ModulePermission::ACTIONS), true);
            $noActions = array_fill_keys(array_values(ModulePermission::ACTIONS), false);

            foreach (Role::query()->get() as $role) {
                if ((string) $role->user_type === '00') {
                    continue;
                }

                $isCandidate = (string) $role->user_type === '21';
                foreach ($modules as $key => $module) {
                    if ($isCandidate) {
                        if ($key !== 'candidate_chat') {
                            ModulePermission::query()
                                ->where('role_id', $role->id)
                                ->where('module_id', $module->id)
                                ->delete();
                            continue;
                        }

                        $grants = $noActions;
                        foreach (['view', 'create', 'edit', 'export'] as $action) {
                            $grants[ModulePermission::ACTIONS[$action]] = true;
                        }
                    } else {
                        $grants = $key === 'candidate_chat'
                            ? $noActions
                            : ($key === 'chat_settings'
                                ? array_merge($noActions, [
                                    ModulePermission::ACTIONS['view'] => true,
                                    ModulePermission::ACTIONS['edit'] => true,
                                    ModulePermission::ACTIONS['manage'] => true,
                                ])
                                : $allActions);
                    }

                    ModulePermission::query()->updateOrCreate(
                        ['role_id' => $role->id, 'module_id' => $module->id],
                        $grants
                    );
                }
            }

            $chat = app(ChatService::class);
            $existingQuestions = $chat->faqs()
                ->pluck('question')
                ->map(fn ($question) => mb_strtolower(trim((string) $question)))
                ->all();
            foreach (self::DEFAULT_FAQS as [$question, $answer]) {
                if (! in_array(mb_strtolower(trim($question)), $existingQuestions, true)) {
                    $chat->createFaq($question, $answer);
                }
            }
        });
    }
}
