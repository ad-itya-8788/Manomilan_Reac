<?php

namespace Tests\Unit;

use App\Profile;
use App\Support\NriProfileScope;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class NriProfileScopeTest extends TestCase
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
        DB::connection()->getPdo()->sqliteCreateFunction(
            'regexp',
            static fn (string $pattern, ?string $value): int => $value !== null
                && preg_match('/'.$pattern.'/i', $value) === 1 ? 1 : 0
        );

        Schema::create('profiles', function (Blueprint $table): void {
            $table->id();
            $table->json('addresses')->nullable();
            $table->string('status')->nullable();
        });
    }

    public function test_scope_uses_current_country_then_recognized_current_address_country(): void
    {
        DB::table('profiles')->insert([
            ['id' => 1, 'addresses' => json_encode(['current' => ['country' => 'United States', 'address' => 'Pune, India']])],
            ['id' => 2, 'addresses' => json_encode(['current' => ['country' => ' india ', 'address' => 'New York, USA']])],
            ['id' => 3, 'addresses' => json_encode(['current' => ['address' => 'Chicago, USA']])],
            ['id' => 4, 'addresses' => json_encode(['current' => ['country' => null, 'address' => 'Pune, Maharashtra, India']])],
            ['id' => 5, 'addresses' => json_encode(['country' => 'Canada'])],
            ['id' => 6, 'addresses' => json_encode(['current' => ['address' => 'Berlin, Germany']])],
            ['id' => 7, 'addresses' => json_encode(['current' => ['address' => '']])],
            ['id' => 8, 'addresses' => json_encode(['current' => ['address' => 'Bucharest, Romania']])],
            ['id' => 9, 'addresses' => json_encode(['current' => ['address' => 'Pneumonia Road']])],
        ]);

        $profileIds = NriProfileScope::apply(Profile::query())
            ->orderBy('id')
            ->pluck('id')
            ->all();

        $this->assertSame([1, 3, 5, 6, 8], $profileIds);
        $unitedStatesIds = NriProfileScope::apply(Profile::query(), 'United States')
            ->orderBy('id')
            ->pluck('id')
            ->all();

        $this->assertSame([1, 3], $unitedStatesIds);
        $this->assertSame('United States', NriProfileScope::countryFromAddress('Chicago, USA'));
        $this->assertNull(NriProfileScope::countryFromAddress('Pune, Maharashtra, India'));
        $this->assertSame('Romania', NriProfileScope::countryFromAddress('Bucharest, Romania'));
        $this->assertNull(NriProfileScope::countryFromAddress('Pneumonia Road'));
        $this->assertSame('United States', NriProfileScope::resolveCountry(null, 'Chicago, USA'));
        $this->assertSame('India', NriProfileScope::resolveCountry(' India ', 'Chicago, USA'));
        $this->assertSame('Germany', NriProfileScope::resolveCountry('null', 'Berlin, Germany'));
    }

    public function test_country_options_include_only_active_nri_countries(): void
    {
        DB::table('profiles')->insert([
            ['id' => 1, 'status' => 'active', 'addresses' => json_encode(['current' => ['address' => 'Toronto, Canada']])],
            ['id' => 2, 'status' => 'deactive', 'addresses' => json_encode(['current' => ['address' => 'Sydney, Australia']])],
            ['id' => 3, 'status' => 'active', 'addresses' => json_encode(['current' => ['country' => 'India']])],
        ]);

        $this->assertSame(['Canada'], NriProfileScope::countryOptions());
    }
}
