<?php

namespace App\Http\Requests\SuperAdmin;

use Illuminate\Validation\Rule;

class UpdateCandidateRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'birth_time' => ['sometimes', 'nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'birth_place' => ['sometimes', 'nullable', 'string', 'max:255'],
            'groomorbride' => ['sometimes', 'required', Rule::in(['Groom', 'Bride'])],
            'marital_status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'height_cm' => ['sometimes', 'nullable', 'numeric', 'min:30', 'max:300'],
            'weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:500'],
            'blood_group' => ['sometimes', 'nullable', 'string', 'max:5'],
            'mother_tongue' => ['sometimes', 'nullable', 'string', 'max:100'],
            'about_me' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'special_cases' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'monthly_income' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'annual_income' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'verification_status' => ['sometimes', 'required', Rule::in(['Pending', 'Completed'])],
            'status' => ['sometimes', 'required', Rule::in(['active', 'deactive'])],
            'profile_photo' => ['sometimes', 'nullable', 'string', 'max:500'],
            'full_body_photo' => ['sometimes', 'nullable', 'string', 'max:500'],
            'half_body_photo' => ['sometimes', 'nullable', 'string', 'max:500'],
            'selfie_photo' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
