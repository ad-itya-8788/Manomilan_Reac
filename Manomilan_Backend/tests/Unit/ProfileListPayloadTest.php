<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\ProfileController;
use App\Profile;
use ReflectionMethod;
use Tests\TestCase;

class ProfileListPayloadTest extends TestCase
{
    public function test_profile_list_item_contains_only_fields_needed_by_the_list(): void
    {
        $profile = new Profile();
        $profile->setRawAttributes([
            'id' => 99,
            'reg_id' => 'MM-099',
            'full_name' => 'Example Candidate',
            'phone' => '9876543210',
            'profile_photo' => null,
            'additional_photos' => null,
            'addresses' => json_encode(['current' => ['country' => 'United States']]),
            'created_at' => '2025-05-12 10:30:00',
            'updated_by_user_id' => 12,
            'has_verified_payment_screenshot' => false,
            'has_verified_melava_payment' => true,
        ]);
        $profile->setRelation('user', null);
        $profile->setRelation('documentVerification', null);
        $profile->setRelation('profileDocuments', null);

        $controller = new ProfileController();
        $method = new ReflectionMethod($controller, 'presentProfileListItem');
        $method->setAccessible(true);

        $this->assertSame([
            'id' => 99,
            'registration_number' => 'MM-099',
            'full_name' => 'Example Candidate',
            'mobile' => '9876543210',
            'photo_url' => '',
            'registration_date' => '12-05-2025',
            'status' => 'Pending',
            'is_verified' => false,
            'payment_verified' => true,
            'country' => 'United States',
            'updated_by_user_id' => 12,
        ], $method->invoke($controller, $profile));
    }
}
