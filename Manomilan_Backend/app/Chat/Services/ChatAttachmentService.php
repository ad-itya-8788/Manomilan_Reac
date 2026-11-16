<?php

namespace App\Chat\Services;

use App\Chat\Models\ChatMessage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatAttachmentService
{
    public function __construct(private readonly ChatSettingsService $settings)
    {
    }

    public function rules(): array
    {
        $settings = $this->settings->get();
        $extensions = implode(',', $settings['allowed_extensions']);

        return [
            'nullable',
            'file',
            'max:'.$settings['max_attachment_kb'],
            'mimes:'.$extensions,
            'extensions:'.$extensions,
        ];
    }

    public function store(UploadedFile $file): array
    {
        $directory = trim((string) config('chat.attachment_directory', 'chat/attachments'), '/');
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension());
        $name = now()->format('YmdHis').'_'.Str::random(24).($extension ? '.'.$extension : '');

        Storage::disk($this->disk())->putFileAs($directory, $file, $name);

        $originalName = basename(str_replace('\\', '/', $file->getClientOriginalName()));

        return [
            'attachment_path' => $directory.'/'.$name,
            'attachment_name' => $originalName !== '' ? $originalName : $name,
            'attachment_type' => $file->getMimeType() ?: 'application/octet-stream',
            'attachment_size' => (int) $file->getSize(),
        ];
    }

    public function delete(?string $path): void
    {
        if (! $path || ! str_starts_with($path, $this->directory().'/')) {
            return;
        }

        Storage::disk($this->disk())->delete($path);
    }

    public function response(ChatMessage $message, bool $download = false): StreamedResponse
    {
        $path = (string) $message->attachment_path;
        abort_unless($path !== '' && str_starts_with($path, $this->directory().'/'), 404);

        $disk = Storage::disk($this->disk());
        abort_unless($disk->exists($path), 404);

        $name = $message->attachment_name ?: basename($path);
        $disposition = $download ? 'attachment' : 'inline';

        return $disk->response($path, $name, [
            'Content-Type' => $message->attachment_type ?: 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=0, no-store',
        ], $disposition);
    }

    public function absolutePath(?string $path): ?string
    {
        if (! $path || ! str_starts_with($path, $this->directory().'/')) {
            return null;
        }

        $disk = Storage::disk($this->disk());

        return $disk->exists($path) ? $disk->path($path) : null;
    }

    private function disk(): string
    {
        return (string) config('chat.attachment_disk', 'public');
    }

    private function directory(): string
    {
        return trim((string) config('chat.attachment_directory', 'chat/attachments'), '/');
    }
}
