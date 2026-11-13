<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\ProfileController;
use App\Profile;
use App\ProfileDocument;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use ReflectionMethod;
use Tests\TestCase;

class ProfileDocumentReferenceTest extends TestCase
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

        Schema::create('profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('identificationProof')->nullable();
        });
    }

    public function test_document_reference_is_retained_when_its_file_is_missing(): void
    {
        $profile = new Profile();
        $profile->setRawAttributes(['id' => 1901, 'identificationProof' => null]);

        $documents = new ProfileDocument();
        $documents->setRawAttributes([
            'aadhaar_card' => 'uploads/melava_documents/missing-id-proof.pdf',
        ]);
        $profile->setRelation('profileDocuments', $documents);

        $controller = new ProfileController();
        $path = $this->invokePrivate($controller, 'documentPath', [
            $profile,
            'identificationProof',
            ['identificationProof' => ['aadhaar_card', 'pan_card', 'passport']],
            [],
        ]);

        $available = $this->invokePrivate($controller, 'documentFileAvailable', [$path]);

        $this->assertSame('uploads/melava_documents/missing-id-proof.pdf', $path);
        $this->assertFalse($available);
    }

    private function invokePrivate(object $target, string $methodName, array $arguments)
    {
        $method = new ReflectionMethod($target, $methodName);
        $method->setAccessible(true);

        return $method->invokeArgs($target, $arguments);
    }
}
