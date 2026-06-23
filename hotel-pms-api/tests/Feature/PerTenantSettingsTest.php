<?php
use App\Models\User;
use App\Models\PropertySetting;
use App\Models\Role;
use App\Models\AppSetting;

function tenant(int $companyId, string $email): User {
    return User::create(['name' => 'U', 'email' => $email, 'password' => 'x', 'role' => 'Owner', 'company_id' => $companyId]);
}

class PerTenantSettingsTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    public function test_property_role_appsetting_are_company_scoped(): void {
        $a = tenant(501, 'pa@a.com'); $b = tenant(502, 'pb@b.com');

        $this->actingAs($a);
        PropertySetting::create(['property_name' => 'A Hotel']);
        Role::create(['name' => 'Manager', 'permissions' => ['/dashboard']]);
        AppSetting::create(['key' => 'preferences', 'value' => ['theme' => 'a']]);

        $this->assertSame(1, PropertySetting::count());
        $this->assertSame(1, Role::count());
        $this->assertSame('A Hotel', PropertySetting::first()->property_name);
        $this->assertSame(501, (int) PropertySetting::first()->company_id);

        $this->actingAs($b);
        $this->assertSame(0, PropertySetting::count(), 'B must not see A property');
        $this->assertSame(0, Role::count(), 'B must not see A roles');
        AppSetting::create(['key' => 'preferences', 'value' => ['theme' => 'b']]);
        $this->assertSame('b', AppSetting::where('key', 'preferences')->first()->value['theme']);
    }

    public function test_property_endpoint_uses_current_company_row(): void {
        $a = tenant(601, 'pe@a.com');
        $this->actingAs($a, 'sanctum');
        $this->getJson('/api/property')->assertOk()->assertJsonPath('company_id', 601);
        $this->putJson('/api/property', ['property_name' => 'Edited'])->assertOk()->assertJsonPath('property_name', 'Edited');
        $this->assertSame('Edited', PropertySetting::where('company_id', 601)->first()->property_name);
    }
}
