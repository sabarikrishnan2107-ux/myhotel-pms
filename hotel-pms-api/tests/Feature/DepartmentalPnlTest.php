<?php

namespace Tests\Feature;

use App\Models\AccountEntry;
use App\Models\BanquetOrder;
use App\Models\FolioPayment;
use App\Models\GroupBooking;
use App\Models\HallBooking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentalPnlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_account_entry_persists_department(): void
    {
        $id = $this->postJson('/api/account-entries', [
            'date' => '2026-06-01', 'type' => 'expense', 'category' => 'F&B cost of goods',
            'description' => 'veg supplies', 'amount' => 5000, 'mode' => 'Cash', 'department' => 'F&B',
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('account_entries', ['id' => $id, 'department' => 'F&B']);
    }
}
