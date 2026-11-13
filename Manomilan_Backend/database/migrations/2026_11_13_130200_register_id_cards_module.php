<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $applicationId = DB::table('applications')->orderBy('id')->value('id');

        if (! $applicationId) {
            return;
        }

        $moduleId = DB::table('modules')->where('module_key', 'id_cards')->value('id');
        $payload = [
            'application_id' => $applicationId,
            'module_name' => 'ID Cards',
            'module_key' => 'id_cards',
            'description' => 'ID card assignment, design and Bio Data access for Aaryans Manomilan.',
            'status' => true,
            'route' => '/admin/id-cards',
            'frontend_routes' => json_encode(['/admin/id-cards']),
            'api_prefixes' => json_encode(['/id-cards']),
            'icon' => 'id-card',
            'sort_order' => 8,
            'updated_at' => now(),
        ];

        if ($moduleId) {
            DB::table('modules')->where('id', $moduleId)->update($payload);
        } else {
            $payload['created_at'] = now();
            $moduleId = DB::table('modules')->insertGetId($payload);
        }

        $sourceModuleId = DB::table('modules')->where('module_key', 'melava_registration')->value('id');
        if (! $sourceModuleId) {
            return;
        }

        $grants = DB::table('module_permissions')->where('module_id', $sourceModuleId)->get();
        foreach ($grants as $grant) {
            $values = [
                'can_view' => (bool) $grant->can_view,
                'can_create' => (bool) $grant->can_create,
                'can_edit' => (bool) $grant->can_edit,
                'can_delete' => (bool) $grant->can_delete,
                'can_import' => (bool) $grant->can_import,
                'can_export' => (bool) $grant->can_export,
                'can_approve' => (bool) $grant->can_approve,
                'can_manage' => (bool) $grant->can_manage,
                'updated_at' => now(),
            ];

            $existing = DB::table('module_permissions')
                ->where('role_id', $grant->role_id)
                ->where('module_id', $moduleId)
                ->exists();

            if ($existing) {
                DB::table('module_permissions')
                    ->where('role_id', $grant->role_id)
                    ->where('module_id', $moduleId)
                    ->update($values);
            } else {
                DB::table('module_permissions')->insert($values + [
                    'role_id' => $grant->role_id,
                    'module_id' => $moduleId,
                    'created_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        $moduleId = DB::table('modules')->where('module_key', 'id_cards')->value('id');
        if ($moduleId) {
            DB::table('module_permissions')->where('module_id', $moduleId)->delete();
            DB::table('modules')->where('id', $moduleId)->delete();
        }
    }
};
