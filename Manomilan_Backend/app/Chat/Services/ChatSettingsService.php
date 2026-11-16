<?php

namespace App\Chat\Services;

use App\Models\WebsiteSetting;
use Illuminate\Support\Facades\File;

class ChatSettingsService
{
    private function path(): string
    {
        return storage_path('app/chat-settings.json');
    }

    public function defaults(): array
    {
        $extra = array_values(array_filter((array) config('chat.extra_extensions', [])));
        $extensions = array_values(array_unique(array_merge(
            (array) config('chat.base_extensions', []),
            $extra
        )));

        return [
            'help_chat_enabled' => true,
            'ai_chatbot_enabled' => true,
            'contact_admin_enabled' => true,
            'admin_available' => false,
            'admin_contact_number' => '',
            'max_attachment_kb' => (int) config('chat.max_attachment_kb', 10240),
            'allowed_extensions' => $extensions,
        ];
    }

    public function get(): array
    {
        $record = WebsiteSetting::query()->firstOrCreate([]);
        $stored = $record->chat_settings;

        if (! is_array($stored)) {
            $stored = $this->legacySettings();
            if ($stored) {
                $record->chat_settings = $stored;
                $record->save();
            }
        }

        if (isset($stored['faq_bot_enabled']) && ! array_key_exists('ai_chatbot_enabled', $stored)) {
            $stored['ai_chatbot_enabled'] = (bool) $stored['faq_bot_enabled'];
        }

        $settings = array_merge(
            $this->defaults(),
            array_intersect_key((array) $stored, $this->defaults())
        );
        foreach (['help_chat_enabled', 'ai_chatbot_enabled', 'contact_admin_enabled', 'admin_available'] as $key) {
            $settings[$key] = (bool) $settings[$key];
        }

        $contactNumber = trim((string) $settings['admin_contact_number']);
        $settings['admin_contact_number'] = preg_match('/^\+?[1-9]\d{7,14}$/', $contactNumber)
            ? $contactNumber
            : '';
        $settings['max_attachment_kb'] = max(512, min(51200, (int) $settings['max_attachment_kb']));
        $settings['allowed_extensions'] = array_values(array_filter(array_map(
            fn ($extension) => strtolower(ltrim(trim((string) $extension), '.')),
            (array) $settings['allowed_extensions']
        )));
        if (! $settings['allowed_extensions']) {
            $settings['allowed_extensions'] = $this->defaults()['allowed_extensions'];
        }

        return $settings;
    }

    public function update(array $data): array
    {
        $record = WebsiteSetting::query()->firstOrCreate([]);
        $settings = array_merge($this->get(), array_intersect_key($data, $this->defaults()));
        $record->chat_settings = $settings;
        $record->save();

        return $this->get();
    }

    private function legacySettings(): array
    {
        try {
            if (! File::exists($this->path())) {
                return [];
            }

            $decoded = json_decode((string) File::get($this->path()), true);
            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable $exception) {
            report($exception);
            return [];
        }
    }
}
