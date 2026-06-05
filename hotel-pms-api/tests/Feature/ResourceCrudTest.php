<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResourceCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_index_returns_a_list(): void
    {
        $this->postJson('/api/guests', ['name' => 'Asha'])->assertCreated();
        $this->postJson('/api/guests', ['name' => 'Ben'])->assertCreated();

        $this->getJson('/api/guests')->assertOk()->assertJsonCount(2);
    }

    public function test_store_creates_a_row(): void
    {
        $this->postJson('/api/guests', ['name' => 'Asha', 'email' => 'asha@example.com'])
            ->assertCreated()
            ->assertJsonFragment(['name' => 'Asha']);

        $this->assertDatabaseHas('guests', ['name' => 'Asha']);
    }

    public function test_store_rejects_missing_required_field(): void
    {
        $this->postJson('/api/guests', ['email' => 'noname@example.com'])
            ->assertStatus(422);
    }

    public function test_update_modifies_a_row(): void
    {
        $id = $this->postJson('/api/guests', ['name' => 'Asha'])->json('id');

        $this->putJson("/api/guests/{$id}", ['vip' => true])
            ->assertOk()
            ->assertJsonFragment(['vip' => true]);
    }

    public function test_destroy_deletes_a_row(): void
    {
        $id = $this->postJson('/api/guests', ['name' => 'Asha'])->json('id');

        $this->deleteJson("/api/guests/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('guests', ['id' => $id]);
    }

    public function test_unknown_resource_is_not_routed(): void
    {
        $this->getJson('/api/not-a-real-resource')->assertNotFound();
    }

    public function test_crud_writes_audit_entries(): void
    {
        $id = $this->postJson('/api/guests', ['name' => 'Asha'])->json('id');
        $this->putJson("/api/guests/{$id}", ['vip' => true])->assertOk();
        $this->deleteJson("/api/guests/{$id}")->assertNoContent();

        $this->assertDatabaseHas('audit_logs', ['module' => 'Guests', 'action' => 'Created']);
        $this->assertDatabaseHas('audit_logs', ['module' => 'Guests', 'action' => 'Deleted']);
    }

    public function test_folio_charges_filter_by_booking_no(): void
    {
        $this->postJson('/api/folio-charges', ['bookingNo' => 'BK1', 'description' => 'Spa']);
        $this->postJson('/api/folio-charges', ['bookingNo' => 'BK2', 'description' => 'Bar']);

        $this->getJson('/api/folio-charges?bookingNo=BK1')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['bookingNo' => 'BK1']);
    }
}
