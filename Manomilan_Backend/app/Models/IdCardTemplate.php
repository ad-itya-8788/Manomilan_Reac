<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdCardTemplate extends Model
{
    protected $table = 'id_card_templates';

    public const DEFAULT_SLUG = 'default';

    protected $fillable = [
        'slug',
        'name',
        'settings',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
        ];
    }
}
