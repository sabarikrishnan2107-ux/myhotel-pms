<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\FolioPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['name' => 'Tester']), 'sanctum');
    }

    public function test_shift_current_auto_opens_a_shift(): void
    {
        $this->getJson('/api/shift/current')
            ->assertOk()
            ->assertJsonFragment(['status' => 'open'])
            ->assertJsonStructure(['number', 'cash', 'card', 'upi', 'online']);

        $this->assertDatabaseCount('cashier_shifts', 1);
    }

    public function test_shift_totals_derive_from_real_payments(): void
    {
        FolioPayment::create(['bookingNo' => 'BK1', 'mode' => 'UPI', 'amount' => 5000]);
        FolioPayment::create(['bookingNo' => 'BK1', 'mode' => 'Cash', 'amount' => 2000]);

        $res = $this->getJson('/api/shift/current')->assertOk();

        $this->assertSame(5000, $res->json('upi'));
        $this->assertSame(2000, $res->json('cash'));
    }

    public function test_shift_close_closes_and_audits(): void
    {
        $this->getJson('/api/shift/current')->assertOk();

        $this->postJson('/api/shift/close', ['physicalCount' => 2000, 'variance' => 0])
            ->assertOk()
            ->assertJsonFragment(['status' => 'closed']);

        $this->assertDatabaseHas('audit_logs', ['module' => 'Cashier', 'action' => 'Shift closed']);
    }

    public function test_night_audit_posts_room_charges_and_is_idempotent(): void
    {
        Booking::create([
            'bookingNo' => 'BK100', 'guestName' => 'Asha', 'roomNumber' => '101',
            'status' => 'checked-in', 'total' => 6000, 'nights' => 3,
        ]);

        $first = $this->postJson('/api/night-audit')->assertOk();
        $this->assertGreaterThanOrEqual(1, $first->json('roomsPosted'));

        // Running again the same day must not double-post.
        $second = $this->postJson('/api/night-audit')->assertOk();
        $this->assertSame(0, $second->json('roomsPosted'));

        $this->assertDatabaseHas('audit_logs', ['module' => 'Night Audit', 'action' => 'Audit completed']);
    }

    public function test_audit_logs_endpoint_returns_recorded_activity(): void
    {
        $this->postJson('/api/guests', ['name' => 'Asha'])->assertCreated();

        $this->getJson('/api/audit-logs')
            ->assertOk()
            ->assertJsonFragment(['module' => 'Guests', 'action' => 'Created']);
    }
}
