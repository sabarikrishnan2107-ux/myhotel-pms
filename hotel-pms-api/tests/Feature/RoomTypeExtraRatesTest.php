<?php
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RoomTypeExtraRatesTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    private function owner(): User {
        DB::table('master_companies')->insert([
            'id'             => 901,
            'name'           => 'TestCo',
            'code'           => 'TC-901',
            'admin_email'    => 'admin@testco901.com',
            'admin_password' => 'x',
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2099-12-31',
            'plan'           => 'starter',
            'max_branches'   => 1,
            'max_rooms'      => 100,
            'max_employees'  => 100,
            'modules'        => json_encode([]),
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
        return User::create(['name' => 'O', 'email' => 'rt@a.com', 'password' => 'x', 'role' => 'Owner', 'company_id' => 901]);
    }

    public function test_room_type_accepts_and_persists_extra_person_rates(): void {
        $this->actingAs($this->owner(), 'sanctum');
        $this->postJson('/api/room-types', [
            'name' => 'Deluxe', 'code' => 'DLX', 'baseTariff' => 6500,
            'maxAdults' => 2, 'maxChildren' => 1, 'extraAdultRate' => 500, 'extraChildRate' => 300, 'active' => true,
        ])->assertSuccessful();

        $list = $this->getJson('/api/room-types')->json();
        // Handle both bare array and {data:[...]} wrapper
        if (isset($list['data'])) {
            $list = $list['data'];
        }
        $row = collect($list)->firstWhere('code', 'DLX');
        $this->assertSame(500, (int) $row['extraAdultRate']);
        $this->assertSame(300, (int) $row['extraChildRate']);
    }

    public function test_extra_rates_reject_negatives(): void {
        $this->actingAs($this->owner(), 'sanctum');
        $this->postJson('/api/room-types', [
            'name' => 'Bad', 'code' => 'BAD', 'baseTariff' => 1000, 'maxAdults' => 2, 'maxChildren' => 1,
            'extraAdultRate' => -5,
        ])->assertStatus(422);
    }
}
