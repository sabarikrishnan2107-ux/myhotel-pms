<?php

namespace Tests\Feature;

use App\Models\AccountEntry;
use App\Models\BanquetOrder;
use App\Models\FolioPayment;
use App\Models\GroupBooking;
use App\Models\HallBooking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountsAutoIncomeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_summary_uses_booking_cash_received_and_supersedes_manual(): void
    {
        // Manual ledger: one colliding category (Room Revenue) + one distinct (F&B) + an expense.
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'Room Revenue', 'description' => 'manual room', 'amount' => 10000]);
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'F&B', 'description' => 'snacks', 'amount' => 2000]);
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'expense', 'category' => 'Salaries', 'description' => 'payroll', 'amount' => 5000]);

        // Real cash received.
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => '2026-06-02', 'mode' => 'Cash', 'amount' => 50000]);
        FolioPayment::create(['bookingNo' => 'BK2', 'date' => '2026-06-03', 'mode' => 'Card', 'amount' => 30000]);
        GroupBooking::create(['advance' => 20000]);
        HallBooking::create(['advance' => 15000]);
        BanquetOrder::create(['advance' => 40000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();

        // Authoritative booking categories (Room Revenue from folio payments, NOT the manual 10000).
        $res->assertJsonFragment(['category' => 'Room Revenue', 'value' => 80000]);
        $res->assertJsonFragment(['category' => 'Group Bookings', 'value' => 20000]);
        $res->assertJsonFragment(['category' => 'Hall Bookings', 'value' => 15000]);
        $res->assertJsonFragment(['category' => 'Banquet', 'value' => 40000]);
        // Non-colliding manual income kept.
        $res->assertJsonFragment(['category' => 'F&B', 'value' => 2000]);

        // Total = 80000 + 20000 + 15000 + 40000 + 2000 (F&B); manual Room Revenue 10000 dropped.
        $this->assertSame(157000, $res->json('incomeTotal'));
        // Expense untouched.
        $res->assertJsonFragment(['category' => 'Salaries', 'value' => 5000]);
    }

    public function test_zero_booking_revenue_categories_are_omitted(): void
    {
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'Misc', 'description' => 'x', 'amount' => 500]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();

        // No bookings => the 4 auto categories should not appear (value 0 omitted).
        $res->assertJsonMissing(['category' => 'Room Revenue']);
        $res->assertJsonMissing(['category' => 'Banquet']);
        $this->assertSame(500, $res->json('incomeTotal'));
    }

    public function test_summary_returns_monthly_and_cash_trends(): void
    {
        $today = date('Y-m-d');
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => $today, 'mode' => 'Cash', 'amount' => 50000]);
        AccountEntry::create(['date' => $today, 'type' => 'expense', 'category' => 'Salaries', 'description' => 'payroll', 'amount' => 20000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();

        $monthly = $res->json('monthlyTrend');
        $this->assertCount(6, $monthly);
        $this->assertSame(50000, $monthly[5]['income']);   // current month
        $this->assertSame(20000, $monthly[5]['expense']);

        $cash = $res->json('cashTrend');
        $this->assertCount(30, $cash);
        // Only today has activity: +50000 income − 20000 expense = +30000 cumulative on the last day.
        $this->assertSame(30000, $cash[29]['balance']);
    }

    public function test_non_iso_account_entry_dates_bucket_into_trends(): void
    {
        // "DD Mon" format (current-year), like the seeder/UI write — must still count.
        AccountEntry::create(['date' => date('j M'), 'type' => 'expense', 'category' => 'Utilities', 'description' => 'power', 'amount' => 7000]);
        AccountEntry::create(['date' => date('j M'), 'type' => 'income', 'category' => 'Misc', 'description' => 'scrap sale', 'amount' => 3000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk();
        $monthly = $res->json('monthlyTrend');
        $this->assertSame(7000, $monthly[5]['expense']);   // current month, non-ISO date counted
        $this->assertSame(3000, $monthly[5]['income']);
        // 30-day cash: +3000 income − 7000 expense = −4000 cumulative on the last day
        $cash = $res->json('cashTrend');
        $this->assertSame(-4000, $cash[29]['balance']);
    }
}
