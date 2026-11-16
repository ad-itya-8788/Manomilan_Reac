<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class AllModulesAndAccessSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ApplicationModuleSeeder::class,
            WebsiteManagementModuleSeeder::class,
            RbacSeeder::class,
            CandidateRoleAccessSeeder::class,
            SuperAdminSeeder::class,
        ]);
    }
}
