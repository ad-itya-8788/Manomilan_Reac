<?php

namespace App\Http\Requests\SuperAdmin;

class UpdateCandidatePasswordRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }
}
