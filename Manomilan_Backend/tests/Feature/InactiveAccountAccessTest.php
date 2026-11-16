<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ProfileController;
use App\Http\Middleware\AuthenticateApiToken;
use App\Models\User;
use App\Role;
use App\Support\ApiToken;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InactiveAccountAccessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.foreign_key_constraints' => true,
        ]);
        DB::purge('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('status')->nullable();
            $table->unsignedBigInteger('profile_id')->nullable();
            $table->timestamps();
        });
        Schema::create('profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('status')->nullable();
            $table->timestamps();
        });

        DB::table('profiles')->insert(['id' => 11, 'status' => 'active']);
        DB::table('users')->insert([
            'id' => 7,
            'status' => 'active',
            'profile_id' => 11,
        ]);

        $migration = require database_path('migrations/2026_11_14_150000_create_api_token_sessions_table.php');
        $migration->up();
    }

    public function test_deactivating_a_profile_disables_its_login_account_and_activation_restores_it(): void
    {
        $admin = new User();
        $role = new Role();
        $role->name = 'Admin';
        $admin->setRelation('role', $role);
        $request = Request::create('/api/profiles/deactivate/11', 'PATCH');
        $request->setUserResolver(fn () => $admin);
        $controller = new ProfileController();

        $response = $controller->deactivate($request, 11);
        $this->assertSame(200, $response->getStatusCode(), $response->getContent());

        $this->assertSame('deactive', DB::table('profiles')->where('id', 11)->value('status'));
        $this->assertSame('inactive', DB::table('users')->where('id', 7)->value('status'));

        $response = $controller->activate($request, 11);
        $this->assertSame(200, $response->getStatusCode(), $response->getContent());

        $this->assertSame('active', DB::table('profiles')->where('id', 11)->value('status'));
        $this->assertSame('active', DB::table('users')->where('id', 7)->value('status'));
    }

    public function test_inactive_accounts_are_rejected_even_with_an_unexpired_token(): void
    {
        $token = ApiToken::create(7);
        DB::table('users')->where('id', 7)->update(['status' => ' INACTIVE ']);
        $request = Request::create('/api/auth/status', 'GET');
        $request->headers->set('Authorization', 'Bearer ' . $token);

        $this->expectException(AuthenticationException::class);
        (new AuthenticateApiToken())->handle($request, fn () => response()->noContent());
    }
}
