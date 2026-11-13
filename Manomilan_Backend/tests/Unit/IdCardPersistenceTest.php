<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\IdCardController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use ReflectionMethod;
use Tests\TestCase;

class IdCardPersistenceTest extends TestCase
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

        Schema::create('id_card_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->json('settings')->nullable();
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->unsignedBigInteger('updated_by_user_id')->nullable();
            $table->timestamps();
        });
    }

    public function test_design_settings_are_saved_and_updated_without_duplicate_templates(): void
    {
        $controller = new IdCardController();
        $request = Request::create('/api/id-cards/design', 'PUT');
        $settings = ['cardWidth' => 100, 'fieldPositions' => ['name' => ['x' => 30, 'y' => 20]]];

        $this->invokePersist($controller, $request, $settings);
        $template = $this->invokePersist($controller, $request, ['cardWidth' => 120]);

        $this->assertSame('default', $template->slug);
        $this->assertSame(1, DB::table('id_card_templates')->where('slug', 'default')->count());
        $this->assertSame(120, $template->settings['cardWidth']);
    }

    private function invokePersist(IdCardController $controller, Request $request, array $settings)
    {
        $method = new ReflectionMethod($controller, 'persistDesignSettings');
        $method->setAccessible(true);

        return $method->invoke($controller, $request, $settings);
    }
}
