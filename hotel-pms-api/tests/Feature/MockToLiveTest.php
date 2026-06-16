<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockToLiveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_folio_adjustments_crud_and_filter(): void
    {
        $this->postJson('/api/folio-adjustments', [
            'bookingNo' => 'BK101083', 'type' => 'Comp',
            'description' => 'Welcome amenity (VIP)', 'amount' => -120, 'approver' => 'Auto · VIP policy',
        ])->assertCreated()->assertJsonFragment(['amount' => -120]);

        $this->postJson('/api/folio-adjustments', [
            'bookingNo' => 'BK999', 'type' => 'Discount', 'amount' => -50,
        ])->assertCreated();

        $this->getJson('/api/folio-adjustments?bookingNo=BK101083')
            ->assertOk()->assertJsonCount(1)
            ->assertJsonFragment(['description' => 'Welcome amenity (VIP)']);
    }

    public function test_folio_adjustment_requires_amount(): void
    {
        $this->postJson('/api/folio-adjustments', ['bookingNo' => 'BK1', 'type' => 'Comp'])
            ->assertStatus(422);
    }

    public function test_guest_kyc_can_be_verified(): void
    {
        $id = $this->postJson('/api/guests', ['name' => 'Asha'])->json('id');

        $this->putJson("/api/guests/{$id}", [
            'idType' => 'Aadhaar', 'idNumber' => 'XXXX-1234',
            'kycVerified' => true, 'kycVerifiedAt' => '2026-06-16 14:08', 'kycVerifiedBy' => 'Front Desk',
        ])->assertOk()->assertJsonFragment(['kycVerified' => true]);

        $this->assertDatabaseHas('guests', ['id' => $id, 'kycVerified' => true, 'idType' => 'Aadhaar']);
    }

    public function test_einvoice_generate_persists_a_row(): void
    {
        $res = $this->postJson('/api/einvoices/generate/BK101083', [
            'taxableValue' => 10000, 'cgst' => 900, 'sgst' => 900, 'igst' => 0,
            'placeOfSupply' => 'Maharashtra (27)', 'recipientGstin' => null,
        ])->assertOk()->assertJsonFragment(['status' => 'generated']);

        $this->assertNotEmpty($res->json('irn'));
        $this->assertDatabaseHas('einvoices', ['bookingNo' => 'BK101083', 'status' => 'generated']);

        $this->getJson('/api/einvoices?bookingNo=BK101083')->assertOk()->assertJsonCount(1);
    }
}
