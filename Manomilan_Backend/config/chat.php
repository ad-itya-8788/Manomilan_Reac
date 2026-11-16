<?php

return [
    'attachment_disk' => 'public',
    'attachment_directory' => 'chat/attachments',
    'max_attachment_kb' => (int) env('CHAT_MAX_ATTACHMENT_KB', 10240),
    'base_extensions' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
    'extra_extensions' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CHAT_EXTRA_EXTENSIONS', ''))
    ))),
    'poll_interval_ms' => (int) env('CHAT_POLL_INTERVAL_MS', 2500),
    'message_page_size' => 30,
];
