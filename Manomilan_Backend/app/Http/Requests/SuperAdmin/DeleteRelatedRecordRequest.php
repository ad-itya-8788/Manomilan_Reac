<?php

namespace App\Http\Requests\SuperAdmin;

class DeleteRelatedRecordRequest extends SuperAdminRequest
{
    public function rules(): array
    {
        return [
            'confirm' => ['required', 'in:DELETE'],
        ];
    }
}
