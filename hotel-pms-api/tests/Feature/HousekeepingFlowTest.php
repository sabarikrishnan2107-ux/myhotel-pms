<?php

namespace Tests\Feature;

use App\Models\HousekeepingTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class HousekeepingFlowTest extends TestCase
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

    private function hkUser(int $cid, string $email = 'maria@hotel.com', string $code = '2001'): User
    {
        return User::factory()->create([
            'email'         => $email,
            'password'      => Hash::make('123456'),
            'role'          => 'Housekeeping',
            'department'    => 'Housekeeping',
            'company_id'    => $cid,
            'employee_code' => $code,
        ]);
    }

    private function makeTask(User $u, int $cid): HousekeepingTask
    {
        return HousekeepingTask::create([
            'room'             => '205',
            'floor'            => 2,
            'roomType'         => 'Deluxe',
            'type'             => 'Checkout Cleaning',
            'priority'         => 'urgent',
            'status'           => 'assigned',
            'assignee'         => $u->name,
            'assignedToUserId' => $u->id,
            'assignedBy'       => 'Front Office',
            'assignedAt'       => now()->toDateTimeString(),
            'company_id'       => $cid,
        ]);
    }

    public function test_housekeeping_login_returns_token_and_employee(): void
    {
        $cid = $this->makeCompany();
        $this->hkUser($cid);

        $this->postJson('/api/housekeeping/login', ['email' => 'maria@hotel.com', 'password' => '123456'])
            ->assertOk()
            ->assertJsonStructure(['token', 'employee' => ['id', 'name', 'role', 'department']]);
    }

    public function test_housekeeping_login_works_with_employee_code(): void
    {
        $cid = $this->makeCompany();
        $this->hkUser($cid, 'maria@hotel.com', '2001');

        $this->postJson('/api/housekeeping/login', ['email' => '2001', 'password' => '123456'])
            ->assertOk()
            ->assertJsonFragment(['employeeCode' => '2001']);
    }

    public function test_non_housekeeping_user_is_rejected(): void
    {
        $cid = $this->makeCompany();
        User::factory()->create([
            'email' => 'front@hotel.com', 'password' => Hash::make('123456'),
            'role' => 'Reception', 'department' => 'Front Office', 'company_id' => $cid,
        ]);

        $this->postJson('/api/housekeeping/login', ['email' => 'front@hotel.com', 'password' => '123456'])
            ->assertStatus(403)
            ->assertJsonFragment(['reason' => 'not_housekeeping']);
    }

    public function test_creating_housekeeping_staff_provisions_a_mobile_login(): void
    {
        $cid = $this->makeCompany();
        $admin = User::factory()->create(['company_id' => $cid, 'role' => 'Admin']);
        $this->actingAs($admin, 'sanctum');

        // Add a housekeeping staff member (as the Staff page does) with an id.
        $this->postJson('/api/staff', [
            'name' => 'Ravi Kumar', 'role' => 'Housekeeper', 'dept' => 'Housekeeping',
            'email' => 'ravi@hotel.com', 'phone' => '9000000000', 'salary' => 20000, 'empId' => '2005',
        ])->assertCreated();

        // The provisioned login signs into the mobile app with the code + default password.
        $this->postJson('/api/housekeeping/login', ['email' => '2005', 'password' => '123456'])
            ->assertOk()
            ->assertJsonFragment(['employeeCode' => '2005', 'name' => 'Ravi Kumar']);
    }

    public function test_full_lifecycle_advances_status(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        $task = $this->makeTask($u, $cid);

        $this->getJson('/api/housekeeping/tasks')
            ->assertOk()->assertJsonFragment(['id' => $task->id, 'status' => 'assigned']);

        // START is the first action (no acknowledge step).
        $this->postJson("/api/housekeeping/tasks/{$task->id}/start")
            ->assertOk()->assertJsonFragment(['status' => 'in_progress']);

        $this->postJson("/api/housekeeping/tasks/{$task->id}/before-photos", ['photoUrls' => ['http://x/before.jpg']])
            ->assertOk()->assertJsonFragment(['status' => 'in_progress', 'photosBefore' => ['http://x/before.jpg']]);

        $this->postJson("/api/housekeeping/tasks/{$task->id}/after-photos", ['photoUrls' => ['http://x/after.jpg']])
            ->assertOk()->assertJsonFragment(['photosAfter' => ['http://x/after.jpg']]);

        $this->postJson("/api/housekeeping/tasks/{$task->id}/complete", ['total_minutes' => 42, 'notes' => 'All clean', 'outcome' => 'ready'])
            ->assertOk()->assertJsonFragment(['status' => 'completed', 'durationMin' => 42, 'notes' => 'All clean', 'outcome' => 'ready']);

        // Now completed → gone from active list, present in history.
        $this->getJson('/api/housekeeping/tasks')->assertOk()->assertJsonMissing(['id' => $task->id]);
        $this->getJson('/api/housekeeping/history')->assertOk()->assertJsonFragment(['id' => $task->id, 'status' => 'completed']);
    }

    public function test_cannot_complete_before_starting(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        $task = $this->makeTask($u, $cid);

        // Task is still 'assigned' (not started) → complete is rejected.
        $this->postJson("/api/housekeeping/tasks/{$task->id}/complete", ['total_minutes' => 5])->assertStatus(422);
    }

    public function test_report_found_creates_lost_and_found_item(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        $task = $this->makeTask($u, $cid);
        $this->postJson("/api/housekeeping/tasks/{$task->id}/start")->assertOk();

        $this->postJson("/api/housekeeping/tasks/{$task->id}/report-found", [
            'name' => 'Gold ring', 'note' => 'Under the bed', 'photosUrls' => ['http://x/ring.jpg'],
        ])->assertCreated()->assertJsonFragment(['ok' => true]);

        $this->assertDatabaseHas('found_items', ['name' => 'Gold ring', 'foundLocation' => 'Room 205', 'department' => 'Housekeeping']);
    }

    public function test_report_damage_creates_maintenance_ticket(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        $task = $this->makeTask($u, $cid);
        $this->postJson("/api/housekeeping/tasks/{$task->id}/start")->assertOk();

        $this->postJson("/api/housekeeping/tasks/{$task->id}/report-damage", [
            'title' => 'Broken AC', 'note' => 'AC not cooling', 'photosUrls' => ['http://x/ac.jpg'], 'voiceUrl' => 'http://x/note.m4a',
        ])->assertCreated()->assertJsonFragment(['ok' => true, 'voiceUrl' => 'http://x/note.m4a']);

        $this->assertDatabaseHas('maintenance_tickets', ['title' => 'Broken AC', 'room' => '205', 'category' => 'Housekeeping']);
    }

    public function test_complete_with_maintenance_blocks_room_and_raises_ticket(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        $room = \App\Models\Room::create(['number' => '205', 'floor' => 2, 'company_id' => $cid]);
        $task = $this->makeTask($u, $cid);
        $task->roomId = $room->id;
        $task->save();

        $this->postJson("/api/housekeeping/tasks/{$task->id}/start")->assertOk();
        $this->postJson("/api/housekeeping/tasks/{$task->id}/complete", ['outcome' => 'maintenance', 'total_minutes' => 10])
            ->assertOk()->assertJsonFragment(['status' => 'completed', 'outcome' => 'maintenance']);

        // Room is blocked (board renders status out-of-order as "maintenance").
        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'out-of-order', 'hkStatus' => 'clean']);
        $this->assertDatabaseHas('maintenance_tickets', ['room' => '205', 'category' => 'Housekeeping']);
    }

    public function test_complete_with_ready_makes_room_available(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        $room = \App\Models\Room::create(['number' => '205', 'floor' => 2, 'company_id' => $cid, 'hkStatus' => 'dirty']);
        $task = $this->makeTask($u, $cid);
        $task->roomId = $room->id;
        $task->save();

        $this->postJson("/api/housekeeping/tasks/{$task->id}/start")->assertOk();
        $this->postJson("/api/housekeeping/tasks/{$task->id}/complete", ['outcome' => 'ready', 'total_minutes' => 10])->assertOk();

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'active', 'hkStatus' => 'clean']);
    }

    public function test_self_assign_creates_a_task_and_claims_the_room(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        \App\Models\Room::create(['number' => '305', 'floor' => 3, 'company_id' => $cid, 'hkStatus' => 'dirty']);

        $this->postJson('/api/housekeeping/self-assign', ['room' => '305', 'roomState' => 'dirty', 'type' => 'Cleaning'])
            ->assertCreated()
            ->assertJsonFragment(['room' => '305', 'status' => 'assigned', 'assignee' => $u->name]);

        $this->assertDatabaseHas('rooms', ['number' => '305', 'hkStatus' => 'cleaning', 'hkAssignee' => $u->name]);
    }

    public function test_self_assign_blocked_when_room_being_cleaned_by_another(): void
    {
        $cid = $this->makeCompany();
        $u = $this->hkUser($cid);
        $this->actingAs($u, 'sanctum');
        \App\Models\Room::create(['number' => '306', 'floor' => 3, 'company_id' => $cid, 'hkStatus' => 'cleaning', 'hkAssignee' => 'Aisha Mohamed']);

        $this->postJson('/api/housekeeping/self-assign', ['room' => '306'])
            ->assertStatus(409)
            ->assertJsonFragment(['reason' => 'in_progress', 'by' => 'Aisha Mohamed']);
    }

    public function test_cannot_touch_another_employees_task(): void
    {
        $cid = $this->makeCompany();
        $owner = $this->hkUser($cid, 'owner-hk@hotel.com');
        $task = $this->makeTask($owner, $cid);

        $other = $this->hkUser($cid, 'other-hk@hotel.com');
        $this->actingAs($other, 'sanctum');

        $this->getJson('/api/housekeeping/tasks')->assertOk()->assertJsonMissing(['id' => $task->id]);
        $this->postJson("/api/housekeeping/tasks/{$task->id}/acknowledge")->assertStatus(403);
    }
}
