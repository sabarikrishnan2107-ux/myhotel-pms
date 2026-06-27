<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingVerificationIdTest extends TestCase
{
    use RefreshDatabase;

    private function actingUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    private function createBooking(): int
    {
        return $this->postJson('/api/bookings', [
            'bookingNo' => 'BK-IDV-1', 'guestName' => 'Id Guest',
            'source' => 'Direct', 'nights' => 1, 'total' => 1000, 'balance' => 0,
        ])->assertCreated()->json('id');
    }

    public function test_verification_persists_and_returns_id_type_and_number(): void
    {
        $this->actingUser();
        $id = $this->createBooking();

        $this->postJson("/api/bookings/{$id}/verification", [
            'id_type'   => 'Aadhaar',
            'id_number' => '1234 5678 9012',
        ])->assertOk();

        $this->getJson("/api/bookings/{$id}")
            ->assertOk()
            ->assertJsonPath('identity.id_type', 'Aadhaar')
            ->assertJsonPath('identity.id_number', '1234 5678 9012');
    }

    public function test_synced_requires_all_docs_and_a_non_empty_id_number(): void
    {
        $this->actingUser();
        $id = $this->createBooking();

        // Four documents but no ID number -> stays in_progress.
        $this->postJson("/api/bookings/{$id}/verification", [
            'guest_photo' => 'https://x/p.jpg',
            'id_front'    => 'https://x/f.jpg',
            'id_back'     => 'https://x/b.jpg',
            'signature'   => '<svg></svg>',
        ])->assertOk()->assertJsonPath('verification_status', 'in_progress');

        // Add the ID number -> now synced.
        $this->postJson("/api/bookings/{$id}/verification", [
            'id_type'   => 'Aadhaar',
            'id_number' => '123456789012',
        ])->assertOk()->assertJsonPath('verification_status', 'synced');
    }
}
