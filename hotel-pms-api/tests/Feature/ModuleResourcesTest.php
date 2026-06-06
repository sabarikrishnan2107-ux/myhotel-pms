<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ModuleResourcesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    /** Each resource: index responds 200, and a minimal create returns 201. */
    public static function resourceProvider(): array
    {
        return [
            'loyalty-members'     => ['loyalty-members', ['name' => 'Member A']],
            'loyalty-tiers'       => ['loyalty-tiers', ['level' => 'Platinum']],
            'loyalty-rewards'     => ['loyalty-rewards', ['name' => 'Free night']],
            'loyalty-campaigns'   => ['loyalty-campaigns', ['name' => 'Diwali Bonus']],
            'account-entries'     => ['account-entries', ['category' => 'Room Revenue', 'description' => 'Settle']],
            'app-users'           => ['app-users', ['name' => 'Staff A', 'email' => 'a@x.com']],
            'hall-bookings'       => ['hall-bookings', ['customer' => 'Wedding']],
            'group-bookings'      => ['group-bookings', ['name' => 'Tour Group']],
            'compliance-licenses' => ['compliance-licenses', ['name' => 'FSSAI', 'authority' => 'FSSAI']],
            'form-c-registrations' => ['form-c-registrations', ['guestName' => 'Mr. Lee Chang']],
            'channels'            => ['channels', ['name' => 'Booking.com']],
            'web-rooms'           => ['web-rooms', ['name' => 'Deluxe']],
            'pricing-rules'       => ['pricing-rules', ['name' => 'Weekend premium']],
        ];
    }

    #[DataProvider('resourceProvider')]
    public function test_resource_index_and_create(string $slug, array $payload): void
    {
        $this->getJson("/api/{$slug}")->assertOk();

        $this->postJson("/api/{$slug}", $payload)
            ->assertCreated()
            ->assertJsonFragment($payload);

        $this->getJson("/api/{$slug}")->assertOk()->assertJsonCount(1);
    }

    public function test_hall_booking_round_trips_status(): void
    {
        $id = $this->postJson('/api/hall-bookings', ['customer' => 'Wedding', 'status' => 'pending'])->json('id');

        $this->putJson("/api/hall-bookings/{$id}", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonFragment(['status' => 'cancelled']);
    }

    public function test_group_booking_stores_json_block(): void
    {
        $block = [['type' => 'Deluxe', 'qty' => 10, 'rate' => 600, 'assigned' => 0]];

        $res = $this->postJson('/api/group-bookings', [
            'name' => 'Tour', 'block' => $block, 'services' => ['Pickup'],
        ])->assertCreated();

        $this->assertSame($block, $res->json('block'));
    }
}
