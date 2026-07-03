<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupRoomingCheckInTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_checked_in_flag_persists_via_update(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-rooming', [
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe',
            'lead' => 'Asha', 'pax' => 2,
        ])->assertCreated()->json();

        $this->assertArrayHasKey('checkedIn', $created);
        $this->assertFalse((bool) $created['checkedIn']);

        $this->putJson("/api/group-rooming/{$created['id']}", ['checkedIn' => true])
            ->assertOk()
            ->assertJsonPath('checkedIn', true);

        $this->assertDatabaseHas('group_rooming', ['id' => $created['id'], 'checkedIn' => true]);
    }

    public function test_checked_in_at_timestamp_persists_via_update(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-rooming', [
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe',
            'lead' => 'Asha', 'pax' => 2,
        ])->assertCreated()->json();

        $this->assertNull($created['checkedInAt'] ?? null);

        $this->putJson("/api/group-rooming/{$created['id']}", [
            'checkedIn' => true, 'checkedInAt' => '2026-07-03T14:32:00.000Z',
        ])->assertOk()->assertJsonPath('checkedInAt', '2026-07-03T14:32:00.000Z');

        $this->assertDatabaseHas('group_rooming', [
            'id' => $created['id'], 'checkedInAt' => '2026-07-03T14:32:00.000Z',
        ]);
    }
}
