<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DocumentVerificationNotificationTest extends TestCase
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

        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('user_type');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('full_name');
            $table->string('groomorbride');
            $table->string('verification_status')->default('Pending');
            $table->timestamps();
        });
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('profile_id')->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('username');
            $table->string('password');
            $table->string('user_type')->nullable();
            $table->foreignId('role_id')->nullable();
            $table->timestamps();
        });
        Schema::create('profile_documents', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id');
            foreach ([
                'aadhaar_card',
                'pan_card',
                'passport',
                'birth_certificate',
                'address_proof',
                'education_certificate',
                'profession_proof',
                'income_proof',
                'caste_certificate',
                'medical_fitness_certificate',
            ] as $column) {
                $table->string($column)->nullable();
            }
            $table->timestamps();
        });
        Schema::create('document_verifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id')->unique();
            foreach ([
                'identificationProof',
                'birthDateProof',
                'addressProof',
                'educationProof',
                'professionProof',
                'incomeProof',
                'casteCertificate',
                'medicalFitnessCertificate',
                'selfieVerification',
            ] as $key) {
                $table->string($key.'_status')->default('pending');
                $table->text($key.'_remarks')->nullable();
            }
            $table->timestamps();
        });
        Schema::create('payment_screenshots', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id');
            $table->boolean('payment_verified')->default(false);
        });
        Schema::create('profile_melava_registrations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('profile_id');
            $table->boolean('payment_verified')->default(false);
        });
        Schema::create('candidate_notifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('type', 80);
            $table->string('title');
            $table->text('message')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
        Schema::create('activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name_snapshot')->nullable();
            $table->string('action', 100);
            $table->unsignedBigInteger('module_id')->nullable();
            $table->string('module_name_snapshot')->nullable();
            $table->string('entity_type', 120)->nullable();
            $table->string('entity_id', 120)->nullable();
            $table->string('candidate_id', 120)->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('request_method', 12)->nullable();
            $table->text('request_url')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        DB::purge('sqlite');

        parent::tearDown();
    }

    public function test_missing_documents_can_be_decided_and_rejection_remarks_notify_the_candidate_once(): void
    {
        $adminRoleId = DB::table('roles')->insertGetId([
            'name' => 'Admin',
            'user_type' => '01',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $candidateRoleId = DB::table('roles')->insertGetId([
            'name' => 'Candidate',
            'user_type' => '21',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $profileId = DB::table('profiles')->insertGetId([
            'groomorbride' => 'Bride',
            'full_name' => 'Candidate Example',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $candidateId = DB::table('users')->insertGetId([
            'profile_id' => $profileId,
            'name' => 'Candidate Example',
            'email' => 'candidate@example.test',
            'username' => '9876543210',
            'password' => bcrypt('secret123'),
            'user_type' => '21',
            'role_id' => $candidateRoleId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $adminId = DB::table('users')->insertGetId([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'username' => 'admin01',
            'password' => bcrypt('secret123'),
            'user_type' => '01',
            'role_id' => $adminRoleId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = \App\Models\User::findOrFail($adminId);

        $payload = [];
        foreach ([
            'identificationProof',
            'birthDateProof',
            'addressProof',
            'educationProof',
            'professionProof',
            'incomeProof',
            'casteCertificate',
            'medicalFitnessCertificate',
            'selfieVerification',
        ] as $key) {
            $payload[$key.'_status'] = 'pending';
            $payload[$key.'_remarks'] = null;
        }
        $payload['identificationProof_status'] = 'verified';
        $payload['addressProof_status'] = 'rejected';
        $payload['addressProof_remarks'] = 'Please upload a clear address proof.';

        $request = Request::create('/api/profiles/'.$profileId.'/verify', 'POST', $payload);
        $request->setUserResolver(fn () => $admin);
        $response = (new ProfileController())->verify($request, $profileId);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            'verified',
            DB::table('document_verifications')->where('profile_id', $profileId)->value('identificationProof_status')
        );
        $this->assertSame(
            'rejected',
            DB::table('document_verifications')->where('profile_id', $profileId)->value('addressProof_status')
        );
        $this->assertSame(
            'Pending',
            DB::table('profiles')->where('id', $profileId)->value('verification_status')
        );

        $notification = DB::table('candidate_notifications')
            ->where('user_id', $candidateId)
            ->where('type', 'document_verification_rejected')
            ->first();
        $this->assertNotNull($notification);
        $this->assertStringContainsString('Please upload a clear address proof.', $notification->message);
        $this->assertSame(
            'Address Proof',
            json_decode($notification->data, true)['documents'][0]['label']
        );

        $request = Request::create('/api/profiles/'.$profileId.'/verify', 'POST', $payload);
        $request->setUserResolver(fn () => $admin);
        (new ProfileController())->verify($request, $profileId);

        $this->assertSame(
            1,
            DB::table('candidate_notifications')
                ->where('user_id', $candidateId)
                ->where('type', 'document_verification_rejected')
                ->count()
        );
    }
}
