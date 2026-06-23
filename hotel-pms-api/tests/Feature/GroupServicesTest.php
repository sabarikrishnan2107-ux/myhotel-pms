<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupServicesTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_crud_round_trip(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-services', [
            'name' => 'Grand Ballroom', 'category' => 'Hall', 'price' => 10000,
            'perPax' => false, 'gst' => 18, 'active' => true,
        ])->assertCreated()->json();

        $this->getJson('/api/group-services')->assertOk()
            ->assertJsonFragment(['name' => 'Grand Ballroom', 'price' => 10000]);

        $this->putJson("/api/group-services/{$created['id']}", ['price' => 12000])
            ->assertOk()->assertJsonPath('price', 12000);

        $this->deleteJson("/api/group-services/{$created['id']}")->assertNoContent();
        $this->getJson('/api/group-services')->assertOk()->assertJsonMissing(['name' => 'Grand Ballroom']);
    }

    public function test_name_is_required(): void
    {
        $this->auth();
        $this->postJson('/api/group-services', ['price' => 100])->assertStatus(422);
    }
}
