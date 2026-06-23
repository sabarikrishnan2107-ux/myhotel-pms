<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Booking;
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
}
