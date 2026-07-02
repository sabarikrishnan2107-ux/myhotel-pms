<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceItemsTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_crud_round_trip(): void
    {
        $this->auth();

        $created = $this->postJson('/api/service-items', [
            'kind' => 'snacks', 'name' => 'Bottled water (1L)', 'price' => 100,
            'hint' => null, 'active' => true,
        ])->assertCreated()->json();

        $this->getJson('/api/service-items')->assertOk()
            ->assertJsonFragment(['name' => 'Bottled water (1L)', 'price' => 100]);

        $this->putJson("/api/service-items/{$created['id']}", ['price' => 120])
            ->assertOk()->assertJsonPath('price', 120);

        $this->deleteJson("/api/service-items/{$created['id']}")->assertNoContent();
        $this->getJson('/api/service-items')->assertOk()->assertJsonMissing(['name' => 'Bottled water (1L)']);
    }

    public function test_name_and_kind_are_required(): void
    {
        $this->auth();
        $this->postJson('/api/service-items', ['price' => 100])->assertStatus(422);
        $this->postJson('/api/service-items', ['name' => 'Iron + board', 'price' => 0])->assertStatus(422);
    }

    public function test_filters_by_kind(): void
    {
        $this->auth();

        $this->postJson('/api/service-items', ['kind' => 'snacks', 'name' => 'Chips', 'price' => 120]);
        $this->postJson('/api/service-items', ['kind' => 'laundry', 'name' => 'Shirt · wash & press', 'price' => 150]);

        $this->getJson('/api/service-items?kind=laundry')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Shirt · wash & press']);
    }
}
