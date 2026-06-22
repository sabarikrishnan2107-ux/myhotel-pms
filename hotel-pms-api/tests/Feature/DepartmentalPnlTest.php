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

class DepartmentalPnlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_account_entry_persists_department(): void
    {
        $id = $this->postJson('/api/account-entries', [
            'date' => '2026-06-01', 'type' => 'expense', 'category' => 'F&B cost of goods',
            'description' => 'veg supplies', 'amount' => 5000, 'mode' => 'Cash', 'department' => 'F&B',
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('account_entries', ['id' => $id, 'department' => 'F&B']);
    }

    public function test_departmental_pnl_maps_revenue_costs_and_overhead(): void
    {
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => '2026-06-02', 'mode' => 'Cash', 'amount' => 100000]);
        BanquetOrder::create(['advance' => 40000]);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'income', 'category' => 'F&B', 'description' => 'restaurant', 'amount' => 25000]);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'expense', 'category' => 'F&B cost of goods', 'description' => 'x', 'amount' => 8000, 'department' => 'F&B']);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'expense', 'category' => 'Payroll', 'description' => 'x', 'amount' => 12000, 'department' => 'General']);
        AccountEntry::create(['date' => '2026-06-03', 'type' => 'refund', 'category' => 'Refund', 'description' => 'x', 'amount' => 1000]);

        $res = $this->getJson('/api/accounts/departmental')->assertOk();

        // Revenue mapped to departments.
        $res->assertJsonFragment(['category' => 'Room Revenue', 'dept' => 'Rooms', 'amount' => 100000]);
        $res->assertJsonFragment(['category' => 'Banquet', 'dept' => 'Banquet', 'amount' => 40000]);
        $res->assertJsonFragment(['category' => 'F&B', 'dept' => 'F&B', 'amount' => 25000]);
        // Direct cost under its department.
        $res->assertJsonFragment(['category' => 'F&B cost of goods', 'dept' => 'F&B', 'amount' => 8000]);
        // Untagged/General expense → overhead; refunds → overhead line.
        $res->assertJsonFragment(['category' => 'Payroll', 'amount' => 12000]);
        $res->assertJsonFragment(['category' => 'Refunds', 'amount' => 1000]);

        $totals = $res->json('totals');
        $this->assertSame(165000, $totals['revenue']);       // 100000 + 40000 + 25000
        $this->assertSame(8000, $totals['directCosts']);
        $this->assertSame(157000, $totals['grossProfit']);   // 165000 - 8000
        $this->assertSame(13000, $totals['overhead']);       // 12000 + 1000 refund
        $this->assertSame(144000, $totals['netProfit']);     // 157000 - 13000
    }
}
