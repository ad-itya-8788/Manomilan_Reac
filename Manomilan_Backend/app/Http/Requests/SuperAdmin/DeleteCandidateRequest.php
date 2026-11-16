<?php

namespace App\Http\Requests\SuperAdmin;

use Illuminate\Validation\Rule;

class DeleteCandidateRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'confirm' => ['required', 'string', Rule::in(['DELETE'])],
            'profile_id' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
