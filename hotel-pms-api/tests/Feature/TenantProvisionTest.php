<?php

namespace Tests\Feature;

use App\Models\PropertySetting;
use App\Models\Role;
use App\Support\TenantProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantProvisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_ensure_seeds_blank_property_and_default_roles_once(): void
    {
        TenantProvisioner::ensure(701);

        $this->assertSame(1, PropertySetting::withoutGlobalScope('company')->where('company_id', 701)->count());
        $roles = Role::withoutGlobalScope('company')->where('company_id', 701)->pluck('name')->all();
        foreach (['Owner','Admin','Manager','Reception','Housekeeping','Accounts','Restaurant','Maintenance'] as $name) {
            $this->assertContains($name, $roles, "$name role should be seeded");
        }
        $this->assertSame('', (string) PropertySetting::withoutGlobalScope('company')->where('company_id', 701)->first()->property_name);

        TenantProvisioner::ensure(701); // idempotent
        $this->assertSame(1, PropertySetting::withoutGlobalScope('company')->where('company_id', 701)->count());
        $this->assertSame(count($roles), Role::withoutGlobalScope('company')->where('company_id', 701)->count());
    }
}
