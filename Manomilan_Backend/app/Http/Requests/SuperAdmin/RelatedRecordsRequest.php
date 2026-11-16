<?php

namespace App\Http\Requests\SuperAdmin;

class RelatedRecordsRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
