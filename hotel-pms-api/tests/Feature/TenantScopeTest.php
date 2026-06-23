<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Booking;
use App\Models\Guest;
use App\Models\Room;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\FolioAdjustment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantScopeTest extends TestCase
{
    use RefreshDatabase;

    private function tenantUser(int $companyId, string $email): User
    {
        return User::create(['name' => 'U', 'email' => $email, 'password' => 'x', 'role' => 'Owner', 'company_id' => $companyId]);
    }

    public function test_scopes_queries_to_the_acting_user_company_and_stamps_inserts(): void
    {
        $a = $this->tenantUser(101, 'a@a.com');
        $b = $this->tenantUser(202, 'b@b.com');

        $this->actingAs($a);
        Booking::create(['bookingNo' => 'A1', 'guestName' => 'GA', 'status' => 'confirmed']);
        $this->assertSame(1, Booking::count());
        $this->assertSame(101, Booking::first()->company_id);

        $this->actingAs($b);
        $this->assertSame(0, Booking::count());
        Booking::create(['bookingNo' => 'B1', 'guestName' => 'GB', 'status' => 'confirmed']);
        $this->assertSame(1, Booking::count());
        $this->assertSame('B1', Booking::first()->bookingNo);

        $this->actingAs($a);
        $this->assertSame(1, Booking::count());
    }

    public function test_all_six_models_isolate_by_company(): void
    {
        $a = $this->tenantUser(301, 'iso-a@a.com');
        $b = $this->tenantUser(302, 'iso-b@b.com');

        $models = [
            Guest::class,
            Booking::class,
            Room::class,
            FolioCharge::class,
            FolioPayment::class,
            FolioAdjustment::class,
        ];

        // Minimum required fields per model (columns that lack a DB-level default in SQLite)
        $minFields = [
            FolioCharge::class     => ['bookingNo' => ''],
            FolioPayment::class    => ['bookingNo' => ''],
            FolioAdjustment::class => ['bookingNo' => ''],
        ];

        $this->actingAs($a);
        foreach ($models as $m) {
            $row = new $m;
            $row->forceFill($minFields[$m] ?? []);
            $row->save();
        }

        foreach ($models as $m) {
            $this->assertSame(1, $m::count(), "$m should show only company A's row");
            $this->assertSame(301, (int) $m::first()->company_id, "$m row should be stamped 301");
        }

        $this->actingAs($b);
        foreach ($models as $m) {
            $this->assertSame(0, $m::count(), "$m must NOT show company A's rows to B");
        }
    }

    public function test_unauthenticated_scope_is_a_noop(): void
    {
        $this->tenantUser(401, 'na@a.com');
        $u = $this->tenantUser(402, 'nb@b.com');

        $this->actingAs($u);
        Booking::create(['bookingNo' => 'N1', 'guestName' => 'X', 'status' => 'confirmed']); // stamped 402

        // log out -> Tenant::id() is null -> scope must add NO filter -> the row is visible
        auth()->logout();
        $this->assertSame(1, Booking::count(), 'unauthenticated must see all rows (no-op scope)');
    }
}
