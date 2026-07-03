<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\GroupBooking;
use App\Models\GroupRooming;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomBoardGroupOccupancyTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_checked_in_group_guest_shows_room_as_occupied(): void
    {
        $this->auth();

        Room::create(['number' => '201', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create([
            'code' => 'GRP1', 'name' => 'Test Wedding', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'confirmed',
        ]);
        GroupRooming::create([
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe',
            'lead' => 'Asha', 'pax' => 2, 'checkedIn' => true, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '201');

        $this->assertSame('occupied', $row['status']);
        $this->assertSame('Asha', $row['guestName']);
        $this->assertSame('Group', $row['source']);
        $this->assertSame('Test Wedding', $row['groupName']);
        $this->assertSame('GRP1', $row['groupCode']);
        $this->assertNull($row['bookingNo']);
    }

    public function test_room_only_assigned_not_checked_in_is_not_occupied(): void
    {
        $this->auth();

        Room::create(['number' => '202', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create([
            'code' => 'GRP2', 'name' => 'Test Conference', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'confirmed',
        ]);
        GroupRooming::create([
            'groupCode' => 'GRP2', 'roomNo' => '202', 'roomType' => 'Deluxe',
            'lead' => 'Ben', 'pax' => 1, 'checkedIn' => false, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '202');

        $this->assertSame('available', $row['status']);
        $this->assertNull($row['guestName']);
    }

    public function test_individual_booking_takes_precedence_over_group_checkin(): void
    {
        $this->auth();

        Room::create(['number' => '203', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        Booking::create([
            'bookingNo' => 'BK1', 'guestName' => 'Chitra', 'roomNumber' => '203',
            'roomType' => 'Deluxe', 'checkIn' => '2026-07-01', 'checkOut' => '2026-07-05',
            'status' => 'checked-in',
        ]);
        GroupBooking::create([
            'code' => 'GRP3', 'name' => 'Test Retreat', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'confirmed',
        ]);
        GroupRooming::create([
            'groupCode' => 'GRP3', 'roomNo' => '203', 'roomType' => 'Deluxe',
            'lead' => 'Deepa', 'pax' => 1, 'checkedIn' => true, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '203');

        $this->assertSame('occupied', $row['status']);
        $this->assertSame('Chitra', $row['guestName']);
        $this->assertSame('BK1', $row['bookingNo']);
    }

    public function test_checked_out_group_guest_frees_the_room(): void
    {
        $this->auth();

        Room::create(['number' => '204', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create([
            'code' => 'GRP4', 'name' => 'Test Wedding', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'in-house',
        ]);
        // Guest checked in AND then checked out — the room should no longer be occupied.
        GroupRooming::create([
            'groupCode' => 'GRP4', 'roomNo' => '204', 'roomType' => 'Deluxe',
            'lead' => 'Esha', 'pax' => 1, 'checkedIn' => true, 'checkedOut' => true,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '204');

        $this->assertSame('available', $row['status']);
        $this->assertNull($row['guestName']);
    }

    public function test_cancelled_group_does_not_occupy_the_room(): void
    {
        $this->auth();

        Room::create(['number' => '205', 'floor' => 2, 'category' => 'Deluxe', 'baseTariff' => 6500]);
        GroupBooking::create([
            'code' => 'GRP5', 'name' => 'Cancelled Group', 'arrival' => '2026-07-10',
            'departure' => '2026-07-12', 'status' => 'cancelled',
        ]);
        // Even a checked-in guest can't occupy a room for a cancelled group.
        GroupRooming::create([
            'groupCode' => 'GRP5', 'roomNo' => '205', 'roomType' => 'Deluxe',
            'lead' => 'Farah', 'pax' => 1, 'checkedIn' => true, 'checkedOut' => false,
        ]);

        $row = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '205');

        $this->assertSame('available', $row['status']);
        $this->assertNull($row['guestName']);
    }
}
