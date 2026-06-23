<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HallPackageExtraFeeTest extends TestCase
{
    use RefreshDatabase;

    public function test_hall_package_accepts_and_returns_extra_pax_fee(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $created = $this->postJson('/api/hall-packages', [
            'name' => 'Grand Ballroom', 'capacity' => 300, 'hourly' => 8500,
            'halfDay' => 38000, 'fullDay' => 72000, 'setupFee' => 5000,
            'gst' => 18, 'extraPaxFee' => 250, 'active' => true,
        ])->assertCreated()->assertJsonPath('extraPaxFee', 250)->json();

        $this->putJson("/api/hall-packages/{$created['id']}", ['extraPaxFee' => 300])
            ->assertOk()->assertJsonPath('extraPaxFee', 300);
    }
}
