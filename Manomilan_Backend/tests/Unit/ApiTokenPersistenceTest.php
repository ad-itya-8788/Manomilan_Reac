<?php

namespace Tests\Unit;

use App\Support\ApiToken;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ApiTokenPersistenceTest extends TestCase
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
        });
        DB::table('users')->insert(['id' => 7]);

        $migration = require database_path('migrations/2026_11_14_150000_create_api_token_sessions_table.php');
        $migration->up();
    }

    public function test_tokens_last_for_their_expiry_and_logout_revokes_only_that_device(): void
    {
        $issuedAt = time();
        $firstDeviceToken = ApiToken::create(7, ApiToken::CANDIDATE_LIFETIME_SECONDS);
        $secondDeviceToken = ApiToken::create(7, ApiToken::CANDIDATE_LIFETIME_SECONDS);

        $this->assertSame(7, ApiToken::userId($firstDeviceToken));
        $this->assertSame(7, ApiToken::userId($secondDeviceToken));
        $this->assertGreaterThanOrEqual(
            $issuedAt + ApiToken::CANDIDATE_LIFETIME_SECONDS,
            ApiToken::expiresAt($firstDeviceToken),
        );
        $this->assertLessThanOrEqual(
            $issuedAt + ApiToken::CANDIDATE_LIFETIME_SECONDS + 1,
            ApiToken::expiresAt($firstDeviceToken),
        );

        ApiToken::revoke($firstDeviceToken, 8);
        $this->assertSame(7, ApiToken::userId($firstDeviceToken));

        ApiToken::revoke($firstDeviceToken, 7);
        $this->assertNull(ApiToken::userId($firstDeviceToken));
        $this->assertSame(7, ApiToken::userId($secondDeviceToken));
    }

    public function test_expired_tokens_are_rejected_and_legacy_tokens_remain_valid_until_expiry(): void
    {
        $expiredToken = Crypt::encryptString(json_encode([
            'user_id' => 7,
            'expires_at' => time() - 1,
        ], JSON_THROW_ON_ERROR));
        $legacyToken = Crypt::encryptString(json_encode([
            'user_id' => 7,
            'expires_at' => time() + 60,
        ], JSON_THROW_ON_ERROR));

        $this->assertNull(ApiToken::userId($expiredToken));
        $this->assertSame(7, ApiToken::userId($legacyToken));
    }
}
