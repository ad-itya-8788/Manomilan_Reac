<?php

namespace App\Http\Requests\SuperAdmin;

class UpdateRelatedRecordRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'values' => ['required', 'array', 'min:1', 'max:50'],
            'values.*' => ['nullable'],
        ];
    }
}
