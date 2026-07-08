<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupBillingFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_group_billing_mode_defaults_and_persists(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-bookings', [
            'code' => 'GRP1', 'name' => 'Test Wedding', 'arrival' => '2026-07-10', 'departure' => '2026-07-12',
        ])->assertCreated()->json();
        $this->assertSame('master', $created['billingMode']);

        $this->putJson("/api/group-bookings/{$created['id']}", ['billingMode' => 'split'])
            ->assertOk()->assertJsonPath('billingMode', 'split');
    }

    public function test_group_booker_id_captures_persist(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-bookings', [
            'code' => 'GRP2', 'name' => 'Sharma Wedding', 'arrival' => '2026-07-10', 'departure' => '2026-07-12',
            'idType' => 'Aadhaar', 'idNumber' => 'A12345678',
            'guestPhoto' => 'data:image/png;base64,PHOTO',
            'idFront' => 'data:image/png;base64,FRONT',
            'idBack' => 'data:image/png;base64,BACK',
            'signature' => 'data:image/png;base64,SIGN',
        ])->assertCreated()->json();

        $this->assertSame('Aadhaar', $created['idType']);
        $this->assertSame('A12345678', $created['idNumber']);

        // The detail page reads these straight off the group row — they must round-trip.
        $this->getJson("/api/group-bookings/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('idNumber', 'A12345678')
            ->assertJsonPath('guestPhoto', 'data:image/png;base64,PHOTO')
            ->assertJsonPath('signature', 'data:image/png;base64,SIGN');

        $this->assertDatabaseHas('group_bookings', [
            'id' => $created['id'], 'idNumber' => 'A12345678', 'idType' => 'Aadhaar',
        ]);
    }

    public function test_rooming_bill_to_defaults_and_persists(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-rooming', [
            'groupCode' => 'GRP1', 'roomNo' => '201', 'roomType' => 'Deluxe', 'lead' => 'Asha', 'pax' => 2,
        ])->assertCreated()->json();
        $this->assertSame('group', $created['billTo']);

        $this->putJson("/api/group-rooming/{$created['id']}", ['billTo' => 'self'])
            ->assertOk()->assertJsonPath('billTo', 'self');
        $this->assertDatabaseHas('group_rooming', ['id' => $created['id'], 'billTo' => 'self']);
    }
}
