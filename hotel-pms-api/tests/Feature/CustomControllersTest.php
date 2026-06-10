<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomControllersTest extends TestCase
{
    use RefreshDatabase;

    private function actingUser(array $attrs = []): User
    {
        $user = User::factory()->create($attrs);
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    // ---- Account ----

    public function test_me_returns_the_authenticated_user(): void
    {
        $this->actingUser(['email' => 'me@hotel.com']);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonFragment(['email' => 'me@hotel.com'])
            ->assertJsonStructure(['id', 'name', 'email', 'two_factor_enabled']);
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $this->assertCount(1, $user->tokens()->get());

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/logout')->assertOk();

        // The access token row is deleted, so the credential is no longer valid.
        $this->assertCount(0, $user->fresh()->tokens()->get());
    }

    public function test_change_password_succeeds_with_correct_current_password(): void
    {
        $this->actingUser(['password' => Hash::make('oldpassword123')]);

        $this->postJson('/api/change-password', [
            'current_password' => 'oldpassword123',
            'new_password'     => 'brandnewpass123',
        ])->assertOk();
    }

    public function test_change_password_rejects_wrong_current_password(): void
    {
        $this->actingUser(['password' => Hash::make('oldpassword123')]);

        $this->postJson('/api/change-password', [
            'current_password' => 'nope',
            'new_password'     => 'brandnewpass123',
        ])->assertStatus(422);
    }

    public function test_change_password_enforces_minimum_length(): void
    {
        $this->actingUser(['password' => Hash::make('oldpassword123')]);

        $this->postJson('/api/change-password', [
            'current_password' => 'oldpassword123',
            'new_password'     => 'short',
        ])->assertStatus(422);
    }

    // ---- Two-factor ----

    public function test_two_factor_setup_enable_and_disable_round_trip(): void
    {
        $this->actingUser();

        $secret = $this->postJson('/api/2fa/setup')
            ->assertOk()
            ->assertJsonStructure(['secret', 'otpauth'])
            ->json('secret');

        // Compute the current valid TOTP for the issued secret.
        $at = new \ReflectionMethod(Totp::class, 'at');
        $at->setAccessible(true);
        $code = $at->invoke(null, $secret, time());

        $this->postJson('/api/2fa/enable', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('two_factor_enabled', true);

        $this->postJson('/api/2fa/disable')
            ->assertOk()
            ->assertJsonPath('two_factor_enabled', false);
    }

    public function test_two_factor_enable_rejects_a_bad_code(): void
    {
        $this->actingUser();
        $this->postJson('/api/2fa/setup')->assertOk();

        $this->postJson('/api/2fa/enable', ['code' => '000000'])->assertStatus(422);
    }

    // ---- Stats / room board ----

    public function test_stats_returns_dashboard_structure(): void
    {
        $this->actingUser();

        $this->getJson('/api/stats')
            ->assertOk()
            ->assertJsonStructure([
                'today',
                'rooms'    => ['total', 'occupied', 'available', 'occupancyPct'],
                'bookings',
                'guests'   => ['total'],
                'revenue',
            ]);
    }

    public function test_room_board_returns_a_list(): void
    {
        $this->actingUser();
        $this->postJson('/api/rooms', ['number' => '101'])->assertCreated();

        $this->getJson('/api/room-board')->assertOk()->assertJsonCount(1);
    }

    public function test_room_board_exposes_booking_ids_for_occupied_rooms(): void
    {
        $this->actingUser();
        $this->postJson('/api/rooms', ['number' => '401'])->assertCreated();
        $this->postJson('/api/bookings', [
            'bookingNo' => 'BK999', 'guestName' => 'Test Guest', 'roomNumber' => '401',
            'source' => 'Direct', 'status' => 'checked-in', 'nights' => 3, 'total' => 9000, 'balance' => 3000,
        ])->assertCreated();

        $room = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '401');

        $this->assertSame('occupied', $room['status']);
        $this->assertSame('BK999', $room['bookingNo']);
        $this->assertNotNull($room['bookingId']);
        $this->assertSame(3, $room['nights']);
        $this->assertSame(3000, $room['balance']);
    }

    public function test_room_board_reports_blocked_rooms(): void
    {
        $this->actingUser();
        $id = $this->postJson('/api/rooms', ['number' => '102'])->assertCreated()->json('id');

        $this->putJson("/api/rooms/{$id}", ['status' => 'blocked'])->assertOk();

        $room = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '102');

        $this->assertSame('blocked', $room['status']);
    }

    public function test_checked_out_booking_frees_the_room(): void
    {
        $this->actingUser();
        $this->postJson('/api/rooms', ['number' => '404'])->assertCreated();
        // A checked-out booking whose date range still spans today must NOT keep the room occupied.
        $this->postJson('/api/bookings', [
            'bookingNo' => 'BK404', 'guestName' => 'Departed Guest', 'roomNumber' => '404',
            'source' => 'Direct', 'status' => 'checked-out',
            'checkIn' => '2000-01-01', 'checkOut' => '2999-12-31',
        ])->assertCreated();

        $room = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '404');

        $this->assertNotSame('occupied', $room['status']);
        $this->assertNull($room['bookingNo']);
    }

    public function test_room_board_exposes_housekeeping_assignment(): void
    {
        $this->actingUser();
        $id = $this->postJson('/api/rooms', ['number' => '103'])->assertCreated()->json('id');

        $this->putJson("/api/rooms/{$id}", [
            'hkStatus' => 'cleaning', 'hkAssignee' => 'Maria Lopez', 'hkStartedAt' => '13:42',
        ])->assertOk();

        $room = collect($this->getJson('/api/room-board')->assertOk()->json())
            ->firstWhere('number', '103');

        $this->assertSame('Maria Lopez', $room['hkAssignee']);
        $this->assertSame('13:42', $room['hkStartedAt']);
    }

    public function test_stats_revenue_breakdown_and_quick_counts(): void
    {
        $this->actingUser();
        $this->getJson('/api/stats')->assertOk()->assertJsonStructure([
            'revenue'     => ['room', 'food', 'hall', 'advance', 'pending', 'total'],
            'quickCounts' => ['checkin', 'checkout', 'housekeeping'],
        ]);
    }

    public function test_revenue_trend_returns_six_months(): void
    {
        $this->actingUser();
        $this->getJson('/api/dashboard/revenue-trend')
            ->assertOk()->assertJsonCount(6)
            ->assertJsonStructure([['month', 'room', 'food', 'hall']]);
    }

    public function test_occupancy_forecast_returns_thirty_days(): void
    {
        $this->actingUser();
        $this->getJson('/api/dashboard/occupancy-forecast')
            ->assertOk()->assertJsonCount(30)
            ->assertJsonStructure([['day', 'occupancy', 'forecast']]);
    }

    public function test_dashboard_alerts_returns_a_list(): void
    {
        $this->actingUser();
        $this->getJson('/api/dashboard/alerts')->assertOk();
    }

    public function test_dashboard_goals_returns_metrics(): void
    {
        $this->actingUser();
        $this->getJson('/api/dashboard/goals')
            ->assertOk()->assertJsonCount(6)
            ->assertJsonStructure([['label', 'current', 'target', 'format', 'pace']]);
    }

    // ---- Property & settings ----

    public function test_property_show_and_update(): void
    {
        $this->actingUser();

        $this->getJson('/api/property')->assertOk();

        $this->putJson('/api/property', ['property_name' => 'The Pearl Marina'])
            ->assertOk();

        $this->getJson('/api/property')->assertOk()->assertJsonFragment(['property_name' => 'The Pearl Marina']);
    }

    public function test_settings_round_trip_by_key(): void
    {
        $this->actingUser();

        $this->putJson('/api/settings/preferences', ['theme' => 'dark', 'density' => 'compact'])
            ->assertOk();

        $this->getJson('/api/settings/preferences')
            ->assertOk()
            ->assertJsonFragment(['theme' => 'dark', 'density' => 'compact']);
    }
}
