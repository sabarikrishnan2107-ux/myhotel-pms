<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorBillsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_can_create_vendor_bill(): void
    {
        $res = $this->postJson('/api/vendor-bills', [
            'billNo' => 'INV-001',
            'vendor' => 'ABC Supplies',
            'category' => 'Linen',
            'billDate' => '2026-06-01',
            'dueDate' => '2026-06-30',
            'taxableValue' => 50000,
            'gst' => 9000,
            'tdsRate' => 2,
            'tdsAmount' => 1000,
            'netPayable' => 58000,
            'paid' => 0,
            'status' => 'Approved',
        ])->assertCreated()->assertJsonFragment(['billNo' => 'INV-001', 'vendor' => 'ABC Supplies']);

        $this->assertDatabaseHas('vendor_bills', ['billNo' => 'INV-001', 'vendor' => 'ABC Supplies', 'netPayable' => 58000]);
        $this->assertSame(58000, $res->json('netPayable'));
    }

    public function test_can_list_vendor_bills(): void
    {
        $this->postJson('/api/vendor-bills', [
            'billNo' => 'INV-002', 'vendor' => 'XYZ Hvac', 'billDate' => '2026-06-02',
            'dueDate' => '2026-06-30', 'status' => 'Approved',
        ])->assertCreated();

        $this->getJson('/api/vendor-bills')
            ->assertOk()
            ->assertJsonFragment(['billNo' => 'INV-002']);
    }

    public function test_can_record_payment_and_derive_status(): void
    {
        $id = $this->postJson('/api/vendor-bills', [
            'billNo' => 'INV-003', 'vendor' => 'Tech Ltd', 'billDate' => '2026-06-01',
            'dueDate' => '2026-06-30', 'netPayable' => 10000, 'status' => 'Approved',
        ])->json('id');

        // Partial payment → status Partial
        $this->putJson("/api/vendor-bills/{$id}", ['paid' => 5000, 'status' => 'Partial'])
            ->assertOk()->assertJsonFragment(['paid' => 5000, 'status' => 'Partial']);

        $this->assertDatabaseHas('vendor_bills', ['id' => $id, 'paid' => 5000, 'status' => 'Partial']);

        // Full payment → status Paid
        $this->putJson("/api/vendor-bills/{$id}", ['paid' => 10000, 'status' => 'Paid'])
            ->assertOk()->assertJsonFragment(['paid' => 10000, 'status' => 'Paid']);

        $this->assertDatabaseHas('vendor_bills', ['id' => $id, 'paid' => 10000, 'status' => 'Paid']);
    }

    public function test_validation_rejects_bad_payload(): void
    {
        // Missing required billNo and vendor
        $this->postJson('/api/vendor-bills', [
            'billDate' => '2026-06-01',
            'dueDate' => '2026-06-30',
        ])->assertStatus(422);
    }
}
