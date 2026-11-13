<?php

namespace Tests\Unit;

use App\DocumentVerification;
use App\Profile;
use Tests\TestCase;

class ProfileVerificationStatusTest extends TestCase
{
    public function test_profile_is_verified_when_required_documents_are_verified_even_if_payment_is_pending(): void
    {
        $profile = $this->profileWithVerificationStatuses('verified');

        $summary = $profile->verificationSummary();

        $this->assertSame('Completed', $summary['status']);
        $this->assertSame('Verified', $summary['display_status']);
        $this->assertTrue($summary['is_verified']);
        $this->assertFalse($summary['payment_verified']);
    }

    public function test_profile_remains_pending_when_a_required_document_is_not_verified(): void
    {
        $profile = $this->profileWithVerificationStatuses('pending');

        $summary = $profile->verificationSummary();

        $this->assertSame('Pending', $summary['status']);
        $this->assertFalse($summary['is_verified']);
    }

    private function profileWithVerificationStatuses(string $birthDateStatus): Profile
    {
        $profile = new Profile();
        $profile->setRawAttributes([
            'identificationProof' => 'identity.pdf',
            'birthDateProof' => 'birth-date.pdf',
        ]);

        $verification = new DocumentVerification();
        $verification->setRawAttributes([
            'identificationProof_status' => 'verified',
            'birthDateProof_status' => $birthDateStatus,
        ]);

        $profile->setRelation('documentVerification', $verification);
        $profile->setRelation('profileDocuments', null);
        $profile->setRelation('paymentScreenshots', collect());
        $profile->setRelation('profileMelavaRegistrations', collect());

        return $profile;
    }
}
