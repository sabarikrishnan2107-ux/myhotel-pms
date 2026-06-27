<?php
use App\Models\User;

class BookingDraftDataTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    private function owner(): User {
        return User::create(['name' => 'O', 'email' => 'bk@a.com', 'password' => 'x', 'role' => 'Owner', 'company_id' => 902]);
    }

    public function test_booking_accepts_and_persists_draft_data(): void {
        $this->actingAs($this->owner(), 'sanctum');
        $this->postJson('/api/bookings', [
            'bookingNo' => 'BK900001', 'guestName' => 'Kumar', 'source' => 'Corporate',
            'adults' => 2, 'children' => 0, 'status' => 'pending',
            'draftData' => ['name' => 'Kumar', 'phone' => '+91 9876543210', 'email' => 'k@x.com', 'idType' => 'Aadhaar'],
        ])->assertSuccessful();

        $row = collect($this->getJson('/api/bookings')->json())->firstWhere('bookingNo', 'BK900001');
        $this->assertSame('+91 9876543210', $row['draftData']['phone']);
        $this->assertSame('Aadhaar', $row['draftData']['idType']);
    }
}
