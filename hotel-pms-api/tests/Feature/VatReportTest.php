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

class VatReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_vat_endpoint_returns_expected_structure(): void
    {
        $res = $this->getJson('/api/accounts/vat')->assertOk();

        $res->assertJsonStructure([
            'taxableIncome',
            'outputVat',
            'inputVat',
            'netVat',
            'itcBySource',
        ]);
    }

    public function test_vat_zeros_when_no_data(): void
    {
        $res = $this->getJson('/api/accounts/vat')->assertOk();

        $this->assertSame(0, $res->json('taxableIncome'));
        $this->assertSame(0, $res->json('outputVat'));
        $this->assertSame(0, $res->json('inputVat'));
        $this->assertSame(0, $res->json('netVat'));
        $this->assertSame([], $res->json('itcBySource'));
    }

    public function test_output_vat_is_5_pct_of_taxable_income(): void
    {
        // Fixed amounts so totals are deterministic.
        FolioPayment::create(['bookingNo' => 'BK1', 'date' => '2026-06-01', 'mode' => 'Cash', 'amount' => 100000]);
        GroupBooking::create(['advance' => 20000]);
        HallBooking::create(['advance' => 30000]);
        BanquetOrder::create(['advance' => 50000]);

        // Manual income (non-auto-cat) — should be counted in taxableIncome
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'Spa & Wellness', 'description' => 'spa', 'amount' => 10000]);

        // Auto-cat manual income — should be EXCLUDED (superseded)
        AccountEntry::create(['date' => '2026-06-01', 'type' => 'income', 'category' => 'Room Revenue', 'description' => 'manual room', 'amount' => 5000]);

        $res = $this->getJson('/api/accounts/vat')->assertOk();

        // taxableIncome = FolioPayment(100000) + Group(20000) + Hall(30000) + Banquet(50000) + Spa(10000) = 210000
        $this->assertSame(210000, $res->json('taxableIncome'));
        // outputVat = round(210000 * 0.05) = 10500
        $this->assertSame(10500, $res->json('outputVat'));
    }

    public function test_input_vat_sums_expense_tax_columns(): void
    {
        // Expense with CGST + SGST
        AccountEntry::create([
            'date' => '2026-06-01', 'type' => 'expense',
            'category' => 'Linen & Amenities', 'description' => 'linen',
            'amount' => 10000, 'cgst' => 900, 'sgst' => 900, 'igst' => 0,
        ]);
        // Expense with IGST only (inter-state)
        AccountEntry::create([
            'date' => '2026-06-02', 'type' => 'expense',
            'category' => 'Marketing', 'description' => 'digital ads',
            'amount' => 5000, 'cgst' => 0, 'sgst' => 0, 'igst' => 900,
        ]);
        // Expense with no tax — should NOT appear in itcBySource
        AccountEntry::create([
            'date' => '2026-06-03', 'type' => 'expense',
            'category' => 'Utilities', 'description' => 'electricity',
            'amount' => 3000,
        ]);

        $res = $this->getJson('/api/accounts/vat')->assertOk();

        // inputVat = 900+900+0 + 0+0+900 = 2700
        $this->assertSame(2700, $res->json('inputVat'));

        $itc = collect($res->json('itcBySource'))->keyBy('category');
        $this->assertCount(2, $itc); // only 2 categories with tax > 0

        $linen = $itc['Linen & Amenities'];
        $this->assertSame(900, $linen['cgst']);
        $this->assertSame(900, $linen['sgst']);
        $this->assertSame(0, $linen['igst']);
        $this->assertSame(1800, $linen['total']);

        $mkt = $itc['Marketing'];
        $this->assertSame(0, $mkt['cgst']);
        $this->assertSame(0, $mkt['sgst']);
        $this->assertSame(900, $mkt['igst']);
        $this->assertSame(900, $mkt['total']);
    }

    public function test_net_vat_is_output_minus_input(): void
    {
        FolioPayment::create(['bookingNo' => 'BK2', 'date' => '2026-06-01', 'mode' => 'Card', 'amount' => 200000]);
        AccountEntry::create([
            'date' => '2026-06-01', 'type' => 'expense',
            'category' => 'F&B Supplies', 'description' => 'supplies',
            'amount' => 20000, 'cgst' => 1800, 'sgst' => 1800, 'igst' => 0,
        ]);

        $res = $this->getJson('/api/accounts/vat')->assertOk();

        // outputVat = round(200000 * 0.05) = 10000
        // inputVat = 1800 + 1800 + 0 = 3600
        // netVat = 10000 - 3600 = 6400
        $this->assertSame(10000, $res->json('outputVat'));
        $this->assertSame(3600, $res->json('inputVat'));
        $this->assertSame(6400, $res->json('netVat'));
    }

    public function test_date_range_filters_apply(): void
    {
        // In range
        FolioPayment::create(['bookingNo' => 'BK3', 'date' => '2026-06-15', 'mode' => 'Cash', 'amount' => 50000]);
        // Out of range
        FolioPayment::create(['bookingNo' => 'BK4', 'date' => '2026-05-01', 'mode' => 'Cash', 'amount' => 999999]);

        $res = $this->getJson('/api/accounts/vat?from=2026-06-01&to=2026-06-30')->assertOk();

        $this->assertSame(50000, $res->json('taxableIncome'));
        $this->assertSame(2500, $res->json('outputVat'));
    }
}
