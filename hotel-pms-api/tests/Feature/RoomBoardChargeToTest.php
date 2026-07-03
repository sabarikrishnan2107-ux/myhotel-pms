<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\GroupBooking;
use App\Models\GroupRooming;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomBoardChargeToTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function board(string $number): array
    {
        return collect($this->getJson('/api/room-board')->assertOk()->json())->firstWhere('number', $number);
    }

    public function test_individual_booking_charge_to_is_its_booking_no(): void
    {
        $this->auth();
        Room::create(['number' => '301', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        Booking::create([
            'bookingNo' => 'BK9', 'guestName' => 'Ivy', 'roomNumber' => '301', 'roomType' => 'Deluxe',
            'checkIn' => '2026-07-01', 'checkOut' => '2026-07-05', 'status' => 'checked-in',
        ]);
        $this->assertSame('BK9', $this->board('301')['chargeTo']);
    }

    public function test_group_pays_guest_charge_to_is_group_code(): void
    {
        $this->auth();
        Room::create(['number' => '302', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create(['code' => 'GRPA', 'name' => 'G', 'arrival' => '2026-07-10', 'departure' => '2026-07-12', 'status' => 'in-house']);
        GroupRooming::create([
            'groupCode' => 'GRPA', 'roomNo' => '302', 'roomType' => 'Deluxe', 'lead' => 'Jo', 'pax' => 1,
            'checkedIn' => true, 'checkedOut' => false, 'billTo' => 'group',
        ]);
        $this->assertSame('GRPA', $this->board('302')['chargeTo']);
    }

    public function test_self_pay_guest_charge_to_is_synthetic_key(): void
    {
        $this->auth();
        Room::create(['number' => '303', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create(['code' => 'GRPB', 'name' => 'G', 'arrival' => '2026-07-10', 'departure' => '2026-07-12', 'status' => 'in-house']);
        $r = GroupRooming::create([
            'groupCode' => 'GRPB', 'roomNo' => '303', 'roomType' => 'Deluxe', 'lead' => 'Kai', 'pax' => 1,
            'checkedIn' => true, 'checkedOut' => false, 'billTo' => 'self',
        ]);
        $this->assertSame("GRPG-{$r->id}", $this->board('303')['chargeTo']);
    }

    public function test_vacant_room_charge_to_is_null(): void
    {
        $this->auth();
        Room::create(['number' => '304', 'floor' => 3, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        $this->assertNull($this->board('304')['chargeTo']);
    }
}
