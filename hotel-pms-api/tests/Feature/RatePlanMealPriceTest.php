<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RatePlanMealPriceTest extends TestCase
{
    use RefreshDatabase;

    public function test_rate_plan_round_trips_meal_prices(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $created = $this->postJson('/api/rate-plans', [
            'code' => 'AP', 'name' => 'American', 'inclBreakfast' => true, 'inclLunch' => true,
            'inclDinner' => true, 'discountPct' => 0, 'refundable' => true, 'active' => true,
            'breakfastPrice' => 200, 'lunchPrice' => 350, 'dinnerPrice' => 450,
        ])->assertCreated()
          ->assertJsonPath('breakfastPrice', 200)
          ->assertJsonPath('lunchPrice', 350)
          ->assertJsonPath('dinnerPrice', 450)
          ->json();

        $this->putJson("/api/rate-plans/{$created['id']}", ['breakfastPrice' => 250])
            ->assertOk()->assertJsonPath('breakfastPrice', 250);
    }
}
