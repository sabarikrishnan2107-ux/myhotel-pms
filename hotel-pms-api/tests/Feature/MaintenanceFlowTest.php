<?php

namespace Tests\Feature;

use App\Models\MaintenanceTicket;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MaintenanceFlowTest extends TestCase
{
    use RefreshDatabase;

    /** Insert a minimal active company row and return its id. */
    private function makeCompany(): int
    {
        return DB::table('master_companies')->insertGetId([
            'name'           => 'Test Hotel',
            'code'           => 'TST-' . uniqid(),
            'admin_email'    => 'admin@hotel.com',
            'admin_password' => 'x',
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2026-12-31',
            'plan'           => 'starter',
            'max_branches'   => 1,
            'max_rooms'      => 10,
            'max_employees'  => 10,
            'modules'        => json_encode([]),
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    private function techUser(int $cid, string $email = 'ravi.k@hotel.com', string $code = '3001'): User
    {
        return User::factory()->create([
            'email'         => $email,
            'password'      => Hash::make('123456'),
            'role'          => 'maintenance',
            'department'    => 'Maintenance',
            'company_id'    => $cid,
            'employee_code' => $code,
        ]);
    }

    private function makeTicket(int $cid, array $overrides = []): MaintenanceTicket
    {
        return MaintenanceTicket::create(array_merge([
            'code'        => 'M-' . random_int(1000, 9999),
            'room'        => '412',
            'title'       => 'Leaking faucet',
            'category'    => 'Plumbing',
            'priority'    => 'high',
            'status'      => 'open',
            'reported'    => now()->toDateString(),
            'description' => 'Water dripping from bathroom sink.',
            'company_id'  => $cid,
        ], $overrides));
    }

    public function test_login_with_employee_code_returns_token(): void
    {
        $cid = $this->makeCompany();
        $this->techUser($cid, 'ravi.k@hotel.com', '3001');

        $this->postJson('/api/maintenance/login', ['employeeCode' => '3001', 'password' => '123456'])
            ->assertOk()
            ->assertJsonStructure(['token', 'employee' => ['id', 'name', 'role', 'department']])
            ->assertJsonFragment(['employeeCode' => '3001']);
    }

    public function test_login_with_email_returns_token(): void
    {
        $cid = $this->makeCompany();
        $this->techUser($cid, 'ravi.k@hotel.com', '3001');

        $this->postJson('/api/maintenance/login', ['email' => 'ravi.k@hotel.com', 'password' => '123456'])
            ->assertOk()
            ->assertJsonStructure(['token', 'employee' => ['id']]);
    }

    public function test_non_maintenance_user_is_rejected(): void
    {
        $cid = $this->makeCompany();
        User::factory()->create([
            'email' => 'front@hotel.com', 'password' => Hash::make('123456'),
            'role' => 'Reception', 'department' => 'Front Office', 'company_id' => $cid,
        ]);

        $this->postJson('/api/maintenance/login', ['email' => 'front@hotel.com', 'password' => '123456'])
            ->assertStatus(403)
            ->assertJsonFragment(['reason' => 'not_maintenance']);
    }

    public function test_tickets_returns_only_mine(): void
    {
        $cid = $this->makeCompany();
        $me = $this->techUser($cid);
        $other = $this->techUser($cid, 'other@hotel.com', '3002');
        $this->actingAs($me, 'sanctum');

        $mine = $this->makeTicket($cid, ['status' => 'assigned', 'assigned_to_user_id' => $me->id, 'assignee' => $me->name]);
        $theirs = $this->makeTicket($cid, ['status' => 'assigned', 'assigned_to_user_id' => $other->id, 'assignee' => $other->name]);
        $openPool = $this->makeTicket($cid, ['status' => 'open']);

        $res = $this->getJson('/api/maintenance/tickets')->assertOk();
        $res->assertJsonFragment(['id' => $mine->id]);
        $res->assertJsonMissing(['id' => $theirs->id]);
        $res->assertJsonMissing(['id' => $openPool->id]);
    }

    public function test_queue_returns_unassigned_open(): void
    {
        $cid = $this->makeCompany();
        $me = $this->techUser($cid);
        $this->actingAs($me, 'sanctum');

        $open = $this->makeTicket($cid, ['status' => 'open']);
        $claimed = $this->makeTicket($cid, ['status' => 'assigned', 'assigned_to_user_id' => $me->id, 'assignee' => $me->name]);

        $this->getJson('/api/maintenance/queue')->assertOk()
            ->assertJsonFragment(['id' => $open->id])
            ->assertJsonMissing(['id' => $claimed->id]);
    }

    public function test_claim_assigns_and_second_tech_gets_conflict(): void
    {
        $cid = $this->makeCompany();
        $a = $this->techUser($cid, 'ravi.k@hotel.com', '3001');
        $b = $this->techUser($cid, 'mahmoud.s@hotel.com', '3002');
        $ticket = $this->makeTicket($cid, ['status' => 'open']);

        // Tech A claims → assigned to A.
        $this->actingAs($a, 'sanctum');
        $this->postJson("/api/maintenance/tickets/{$ticket->id}/claim")
            ->assertOk()
            ->assertJsonFragment(['id' => $ticket->id, 'status' => 'assigned', 'assignee' => $a->name, 'assignedToUserId' => $a->id]);

        // Tech A claiming again is idempotent.
        $this->postJson("/api/maintenance/tickets/{$ticket->id}/claim")
            ->assertOk()->assertJsonFragment(['status' => 'assigned', 'assignedToUserId' => $a->id]);

        // Tech B (different) claiming → 409.
        $this->actingAs($b, 'sanctum');
        $this->postJson("/api/maintenance/tickets/{$ticket->id}/claim")
            ->assertStatus(409)
            ->assertJsonFragment(['reason' => 'already_claimed', 'by' => $a->name]);
    }

    public function test_full_lifecycle_advances_status(): void
    {
        $cid = $this->makeCompany();
        $me = $this->techUser($cid);
        $this->actingAs($me, 'sanctum');
        $ticket = $this->makeTicket($cid, ['status' => 'assigned', 'assigned_to_user_id' => $me->id, 'assignee' => $me->name]);

        $this->getJson('/api/maintenance/tickets')
            ->assertOk()->assertJsonFragment(['id' => $ticket->id, 'status' => 'assigned']);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/start")
            ->assertOk()->assertJsonFragment(['status' => 'in-progress']);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/before-photos", ['photosUrls' => ['http://x/before.jpg']])
            ->assertOk()->assertJsonFragment(['photosBefore' => ['http://x/before.jpg']]);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/after-photos", ['photosUrls' => ['http://x/after.jpg']])
            ->assertOk()->assertJsonFragment(['photosAfter' => ['http://x/after.jpg']]);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/notes", ['notes' => 'Replaced washer', 'parts' => ['washer', 'o-ring']])
            ->assertOk()->assertJsonFragment(['notes' => 'Replaced washer', 'parts' => ['washer', 'o-ring']]);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/resolve", ['outcome' => 'fixed', 'totalMinutes' => 35])
            ->assertOk()->assertJsonFragment(['status' => 'resolved', 'outcome' => 'fixed', 'totalMinutes' => 35]);

        // Now resolved → gone from active list, present in history.
        $this->getJson('/api/maintenance/tickets')->assertOk()->assertJsonMissing(['id' => $ticket->id]);
        $this->getJson('/api/maintenance/history')->assertOk()->assertJsonFragment(['id' => $ticket->id, 'status' => 'resolved']);
    }

    public function test_resolve_fixed_puts_room_back_in_service(): void
    {
        $cid = $this->makeCompany();
        $me = $this->techUser($cid);
        $this->actingAs($me, 'sanctum');
        $room = Room::create(['number' => '412', 'floor' => 4, 'company_id' => $cid, 'status' => 'out-of-order', 'hkStatus' => 'clean']);
        $ticket = $this->makeTicket($cid, [
            'room' => '412', 'room_id' => $room->id,
            'status' => 'in-progress', 'assigned_to_user_id' => $me->id, 'assignee' => $me->name,
        ]);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/resolve", ['outcome' => 'fixed', 'totalMinutes' => 20])
            ->assertOk()->assertJsonFragment(['status' => 'resolved', 'outcome' => 'fixed']);

        // Room is back in service (sellable) + clean.
        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'active', 'hkStatus' => 'clean']);
    }

    public function test_resolve_escalate_reopens_into_queue(): void
    {
        $cid = $this->makeCompany();
        $me = $this->techUser($cid);
        $this->actingAs($me, 'sanctum');
        $room = Room::create(['number' => '412', 'floor' => 4, 'company_id' => $cid, 'status' => 'out-of-order', 'hkStatus' => 'clean']);
        $ticket = $this->makeTicket($cid, [
            'room' => '412', 'room_id' => $room->id,
            'status' => 'in-progress', 'assigned_to_user_id' => $me->id, 'assignee' => $me->name,
        ]);

        $this->postJson("/api/maintenance/tickets/{$ticket->id}/resolve", ['outcome' => 'escalate', 'notes' => 'Need a new pump'])
            ->assertOk()
            ->assertJsonFragment(['status' => 'open', 'outcome' => 'escalate', 'assignee' => null, 'assignedToUserId' => null]);

        // Back in the unassigned queue.
        $this->getJson('/api/maintenance/queue')->assertOk()->assertJsonFragment(['id' => $ticket->id]);

        // Room stays blocked (not put back in service).
        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'out-of-order']);
    }

    public function test_cannot_touch_another_technicians_ticket(): void
    {
        $cid = $this->makeCompany();
        $owner = $this->techUser($cid, 'owner@hotel.com', '3001');
        $ticket = $this->makeTicket($cid, ['status' => 'assigned', 'assigned_to_user_id' => $owner->id, 'assignee' => $owner->name]);

        $other = $this->techUser($cid, 'other@hotel.com', '3002');
        $this->actingAs($other, 'sanctum');

        $this->getJson('/api/maintenance/tickets')->assertOk()->assertJsonMissing(['id' => $ticket->id]);
        $this->postJson("/api/maintenance/tickets/{$ticket->id}/start")->assertStatus(403);
    }
}
