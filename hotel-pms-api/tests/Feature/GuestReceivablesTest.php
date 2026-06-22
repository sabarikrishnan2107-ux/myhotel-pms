<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestReceivablesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_receivables_endpoint_returns_correct_structure(): void
    {
        $res = $this->getJson('/api/accounts/receivables')->assertOk();

        $res->assertJsonStructure([
            'rows' => [
                '*' => ['guest', 'bookings', 'current', 'd1_30', 'd31_60', 'd60plus', 'total', 'oldestDue'],
            ],
            'totals' => ['total', 'current', 'd1_30', 'd31_60', 'd60plus', 'accounts'],
        ]);
    }

    public function test_receivables_excludes_zero_balance_and_cancelled_bookings(): void
    {
        $today = now()->toDateString();
        $futureCheckOut = now()->addDays(5)->toDateString();

        // Zero balance — should be excluded
        Booking::create([
            'guestName' => 'Zero Balance Guest',
            'bookingNo' => 'BK001',
            'balance' => 0,
            'status' => 'checked-out',
            'checkOut' => $today,
        ]);

        // Cancelled — should be excluded even with a balance
        Booking::create([
            'guestName' => 'Cancelled Guest',
            'bookingNo' => 'BK002',
            'balance' => 5000,
            'status' => 'cancelled',
            'checkOut' => $futureCheckOut,
        ]);

        $res = $this->getJson('/api/accounts/receivables')->assertOk();

        $guests = collect($res->json('rows'))->pluck('guest');
        $this->assertNotContains('Zero Balance Guest', $guests->all());
        $this->assertNotContains('Cancelled Guest', $guests->all());
        $this->assertSame(0, $res->json('totals.accounts'));
    }

    public function test_receivables_buckets_bookings_by_age(): void
    {
        // Use FIXED past/future dates relative to today for deterministic buckets
        $today = now()->toDateString();

        // current: checkOut >= today (not overdue)
        Booking::create([
            'guestName' => 'Priya Sharma',
            'bookingNo' => 'BK100',
            'balance' => 10000,
            'status' => 'checked-in',
            'checkOut' => now()->addDays(2)->toDateString(),
        ]);

        // d1_30: checkOut was 15 days ago
        Booking::create([
            'guestName' => 'Raj Kumar',
            'bookingNo' => 'BK101',
            'balance' => 20000,
            'status' => 'checked-out',
            'checkOut' => now()->subDays(15)->toDateString(),
        ]);

        // d31_60: checkOut was 45 days ago
        Booking::create([
            'guestName' => 'Neha Rao',
            'bookingNo' => 'BK102',
            'balance' => 30000,
            'status' => 'checked-out',
            'checkOut' => now()->subDays(45)->toDateString(),
        ]);

        // d60plus: checkOut was 90 days ago
        Booking::create([
            'guestName' => 'Amit Singh',
            'bookingNo' => 'BK103',
            'balance' => 40000,
            'status' => 'checked-out',
            'checkOut' => now()->subDays(90)->toDateString(),
        ]);

        $res = $this->getJson('/api/accounts/receivables')->assertOk();
        $rows = collect($res->json('rows'))->keyBy('guest');

        // current bucket
        $this->assertSame(10000, $rows['Priya Sharma']['current']);
        $this->assertSame(0, $rows['Priya Sharma']['d1_30']);
        $this->assertSame(0, $rows['Priya Sharma']['d31_60']);
        $this->assertSame(0, $rows['Priya Sharma']['d60plus']);

        // d1_30 bucket
        $this->assertSame(0, $rows['Raj Kumar']['current']);
        $this->assertSame(20000, $rows['Raj Kumar']['d1_30']);
        $this->assertSame(0, $rows['Raj Kumar']['d31_60']);
        $this->assertSame(0, $rows['Raj Kumar']['d60plus']);

        // d31_60 bucket
        $this->assertSame(0, $rows['Neha Rao']['current']);
        $this->assertSame(0, $rows['Neha Rao']['d1_30']);
        $this->assertSame(30000, $rows['Neha Rao']['d31_60']);
        $this->assertSame(0, $rows['Neha Rao']['d60plus']);

        // d60plus bucket
        $this->assertSame(0, $rows['Amit Singh']['current']);
        $this->assertSame(0, $rows['Amit Singh']['d1_30']);
        $this->assertSame(0, $rows['Amit Singh']['d31_60']);
        $this->assertSame(40000, $rows['Amit Singh']['d60plus']);
    }

    public function test_receivables_aggregates_multiple_bookings_per_guest(): void
    {
        // Two bookings for the same guest, in different buckets
        Booking::create([
            'guestName' => 'Vikram Patel',
            'bookingNo' => 'BK200',
            'balance' => 15000,
            'status' => 'checked-in',
            'checkOut' => now()->addDays(3)->toDateString(),  // current
        ]);

        Booking::create([
            'guestName' => 'Vikram Patel',
            'bookingNo' => 'BK201',
            'balance' => 25000,
            'status' => 'checked-out',
            'checkOut' => now()->subDays(20)->toDateString(), // d1_30
        ]);

        $res = $this->getJson('/api/accounts/receivables')->assertOk();
        $rows = collect($res->json('rows'))->keyBy('guest');

        $this->assertSame(2, $rows['Vikram Patel']['bookings']);
        $this->assertSame(15000, $rows['Vikram Patel']['current']);
        $this->assertSame(25000, $rows['Vikram Patel']['d1_30']);
        $this->assertSame(40000, $rows['Vikram Patel']['total']);
    }

    public function test_receivables_totals_and_oldest_due(): void
    {
        $olderDate = now()->subDays(50)->toDateString(); // d31_60
        $newerDate = now()->subDays(10)->toDateString(); // d1_30

        Booking::create([
            'guestName' => 'Sunita Mehta',
            'bookingNo' => 'BK300',
            'balance' => 12000,
            'status' => 'checked-out',
            'checkOut' => $olderDate,
        ]);

        Booking::create([
            'guestName' => 'Sunita Mehta',
            'bookingNo' => 'BK301',
            'balance' => 8000,
            'status' => 'checked-out',
            'checkOut' => $newerDate,
        ]);

        $res = $this->getJson('/api/accounts/receivables')->assertOk();
        $rows = collect($res->json('rows'))->keyBy('guest');

        // oldestDue should be the earlier (smaller) date
        $this->assertSame($olderDate, $rows['Sunita Mehta']['oldestDue']);

        // Totals: 1 distinct guest, combined balance 20000
        $totals = $res->json('totals');
        $this->assertSame(20000, $totals['total']);
        $this->assertSame(1, $totals['accounts']);
        $this->assertSame(8000, $totals['d1_30']);
        $this->assertSame(12000, $totals['d31_60']);
    }

    public function test_receivables_rows_sorted_by_total_descending(): void
    {
        // Higher total guest
        Booking::create([
            'guestName' => 'High Balance Guest',
            'bookingNo' => 'BK400',
            'balance' => 80000,
            'status' => 'checked-out',
            'checkOut' => now()->subDays(5)->toDateString(),
        ]);

        // Lower total guest
        Booking::create([
            'guestName' => 'Low Balance Guest',
            'bookingNo' => 'BK401',
            'balance' => 10000,
            'status' => 'checked-out',
            'checkOut' => now()->subDays(5)->toDateString(),
        ]);

        $res = $this->getJson('/api/accounts/receivables')->assertOk();
        $rows = $res->json('rows');

        $this->assertSame('High Balance Guest', $rows[0]['guest']);
        $this->assertSame('Low Balance Guest', $rows[1]['guest']);
    }
}
