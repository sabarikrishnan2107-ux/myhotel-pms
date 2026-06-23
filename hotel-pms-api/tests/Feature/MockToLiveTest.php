<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MockToLiveTest extends TestCase
{
    use RefreshDatabase;

    private function makeCompanyId(): int
    {
        return DB::table('master_companies')->insertGetId([
            'name'           => 'Test Hotel',
            'code'           => 'TST-' . uniqid(),
            'admin_email'    => 'admin@hotel.com',
            'admin_password' => 'x',
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2026-12-31',
            'plan'           => 'starter',
            'max_branches'   => 1,
            'max_rooms'      => 10,
            'max_employees'  => 10,
            'modules'        => json_encode([]),
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['company_id' => $this->makeCompanyId()]), 'sanctum');
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

    public function test_accounts_summary_aggregates_entries(): void
    {
        $this->postJson('/api/account-entries', ['type' => 'income', 'category' => 'Room', 'description' => 'Room rev', 'amount' => 10000]);
        $this->postJson('/api/account-entries', ['type' => 'income', 'category' => 'Room', 'description' => 'Room rev 2', 'amount' => 5000]);
        $this->postJson('/api/account-entries', ['type' => 'expense', 'category' => 'Payroll', 'description' => 'Salary', 'amount' => 8000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk()
            ->assertJsonStructure(['income', 'expense', 'recent']);

        $income = collect($res->json('income'))->firstWhere('category', 'Room');
        $this->assertSame(15000, $income['value']);
    }

    public function test_competitors_and_rates_crud(): void
    {
        $this->postJson('/api/competitors', ['hotel' => 'The Westin', 'brand' => 'Marriott', 'km' => 2.1, 'stars' => 5, 'source' => 'Booking.com'])
            ->assertCreated()->assertJsonFragment(['hotel' => 'The Westin']);

        $this->postJson('/api/competitor-rates', ['competitorId' => 'westin', 'date' => '2026-06-16', 'roomType' => 'STD', 'rate' => 8200])
            ->assertCreated();
        $this->postJson('/api/competitor-rates', ['competitorId' => 'trident', 'date' => '2026-06-16', 'roomType' => 'STD', 'rate' => 7600]);

        $this->getJson('/api/competitor-rates?competitorId=westin')->assertOk()->assertJsonCount(1);
    }

    public function test_meal_plans_crud(): void
    {
        $this->postJson('/api/meal-plans', ['code' => 'CP', 'name' => 'Continental (CP)', 'perPaxPerDay' => 950, 'desc' => 'Breakfast only'])
            ->assertCreated()->assertJsonFragment(['code' => 'CP']);
        $this->getJson('/api/meal-plans')->assertOk()->assertJsonFragment(['perPaxPerDay' => 950]);
    }

    public function test_staff_account_creates_real_login_with_role_and_pages(): void
    {
        // Define a role with a page set.
        $this->postJson('/api/roles', ['name' => 'Reception', 'permissions' => ['/dashboard', '/bookings', '/folio']])->assertCreated();

        // Create a staff account (real login user) with a password.
        $res = $this->postJson('/api/staff-accounts', [
            'name' => 'Riya Desk', 'email' => 'riya@hotel.com', 'password' => 'secret123',
            'role' => 'Reception', 'department' => 'Front Office',
        ])->assertCreated()->assertJsonFragment(['email' => 'riya@hotel.com', 'role' => 'Reception']);
        $this->assertArrayNotHasKey('password', $res->json());

        // That account can log in, and login returns its role + allowed pages.
        $login = $this->postJson('/api/login', ['email' => 'riya@hotel.com', 'password' => 'secret123'])
            ->assertOk()->json();
        $this->assertSame('Reception', $login['user']['role']);
        $this->assertEqualsCanonicalizing(['/dashboard', '/bookings', '/folio'], $login['user']['pages']);
    }

    public function test_banquet_packages_and_extra_services_crud(): void
    {
        $this->postJson('/api/banquet-packages', ['name' => 'Veg Royal', 'pricePerPax' => 285, 'veg' => true])
            ->assertCreated()->assertJsonFragment(['name' => 'Veg Royal', 'veg' => true]);
        $this->getJson('/api/banquet-packages')->assertOk()->assertJsonFragment(['pricePerPax' => 285]);

        $this->postJson('/api/extra-services', ['label' => 'AV & Stage', 'price' => 3800])
            ->assertCreated()->assertJsonFragment(['label' => 'AV & Stage']);
        $this->getJson('/api/extra-services')->assertOk()->assertJsonFragment(['price' => 3800]);
    }
}
