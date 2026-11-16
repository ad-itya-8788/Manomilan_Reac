<?php

namespace App\Chat\Requests;

use App\Chat\Services\ChatSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;

class SendChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        $settings = app(ChatSettingsService::class)->get();
        $extensions = implode(',', $settings['allowed_extensions']);

        return [
            'message' => ['nullable', 'string', 'max:5000'],
            'attachment' => [
                'nullable',
                'file',
                'max:'.$settings['max_attachment_kb'],
                'mimes:'.$extensions,
                'extensions:'.$extensions,
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $message = trim((string) $this->input('message'));
            if ($message === '' && ! $this->hasFile('attachment')) {
                $validator->errors()->add('message', 'Please type a message or attach a file.');
            }
        });
    }
}
