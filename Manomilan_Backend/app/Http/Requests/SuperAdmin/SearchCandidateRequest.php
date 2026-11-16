<?php

namespace App\Http\Requests\SuperAdmin;

class SearchCandidateRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
