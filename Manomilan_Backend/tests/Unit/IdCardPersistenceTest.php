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

        Schema::create('profile_melava_registrations', function (Blueprint $table): void {
            $table->id();
            $table->string('unique_id_number')->nullable()->unique();
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

    public function test_assignment_preview_generates_sequential_unique_numbers(): void
    {
        $rows = collect([
            (object) ['id' => 1, 'profile_id' => 11, 'unique_id_number' => null, 'full_name' => 'Candidate One', 'reg_id' => 'R001', 'birth_date' => '2000-01-01', 'calculated_age' => 25],
            (object) ['id' => 2, 'profile_id' => 12, 'unique_id_number' => null, 'full_name' => 'Candidate Two', 'reg_id' => 'R002', 'birth_date' => '2001-01-01', 'calculated_age' => 24],
            (object) ['id' => 3, 'profile_id' => 13, 'unique_id_number' => null, 'full_name' => 'Candidate Three', 'reg_id' => 'R003', 'birth_date' => '2002-01-01', 'calculated_age' => 23],
        ]);

        $preview = $this->invokeBuildAssignmentPreview(new IdCardController(), $rows);

        $this->assertSame(
            ['AA-02-001', 'AA-02-002', 'AA-02-003'],
            array_column($preview['candidates'], 'proposed_unique_id_number')
        );
    }

    public function test_assignment_preview_skips_existing_ids_and_reports_the_conflict(): void
    {
        DB::table('profile_melava_registrations')->insert([
            'id' => 9,
            'unique_id_number' => 'AA-02-001 ',
        ]);
        $rows = collect([
            (object) ['id' => 1, 'profile_id' => 11, 'unique_id_number' => null, 'full_name' => 'Candidate One', 'reg_id' => 'R001', 'birth_date' => '2000-01-01', 'calculated_age' => 25],
            (object) ['id' => 2, 'profile_id' => 12, 'unique_id_number' => null, 'full_name' => 'Candidate Two', 'reg_id' => 'R002', 'birth_date' => '2001-01-01', 'calculated_age' => 24],
        ]);

        $preview = $this->invokeBuildAssignmentPreview(new IdCardController(), $rows);

        $this->assertSame(
            ['AA-02-002', 'AA-02-003'],
            array_column($preview['candidates'], 'proposed_unique_id_number')
        );
        $this->assertSame(1, $preview['existing_id_conflict_count']);
        $this->assertSame(['AA-02-001'], $preview['existing_id_conflict_numbers']);
    }

    public function test_assignment_query_can_be_limited_to_a_marital_status(): void
    {
        $query = $this->invokeAssignmentQuery(new IdCardController(), 18, 25, 'Divorced');

        $this->assertStringContainsString('LOWER(TRIM(p.marital_status)) = ?', $query->toSql());
        $this->assertSame([18, 25, 'divorced'], $query->getBindings());
    }

    public function test_assignment_prefix_normalizes_trailing_hyphens_and_named_segments(): void
    {
        $controller = new IdCardController();
        foreach ([
            ['AA-01-', 'AA-01'],
            ['AA-unique', 'AA-UNIQUE'],
        ] as [$input, $expected]) {
            $request = Request::create('/api/id-cards/assignment/preview', 'GET', [
                'prefix' => $input,
                'age_min' => 18,
                'age_max' => 25,
            ]);

            $this->assertSame($expected, $this->invokeValidateAssignment($controller, $request)['prefix']);
        }
    }

    private function invokePersist(IdCardController $controller, Request $request, array $settings)
    {
        $method = new ReflectionMethod($controller, 'persistDesignSettings');
        $method->setAccessible(true);

        return $method->invoke($controller, $request, $settings);
    }

    private function invokeBuildAssignmentPreview(IdCardController $controller, $rows): array
    {
        $method = new ReflectionMethod($controller, 'buildAssignmentPreview');
        $method->setAccessible(true);

        return $method->invoke($controller, 'AA-02', 18, 25, $rows);
    }

    private function invokeAssignmentQuery(
        IdCardController $controller,
        int $ageMin,
        int $ageMax,
        ?string $maritalStatus = null
    ) {
        $method = new ReflectionMethod($controller, 'assignmentQuery');
        $method->setAccessible(true);

        return $method->invoke($controller, $ageMin, $ageMax, $maritalStatus);
    }

    private function invokeValidateAssignment(IdCardController $controller, Request $request): array
    {
        $method = new ReflectionMethod($controller, 'validateAssignment');
        $method->setAccessible(true);

        return $method->invoke($controller, $request);
    }
}
