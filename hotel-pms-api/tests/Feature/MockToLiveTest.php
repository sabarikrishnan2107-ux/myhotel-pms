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
}
