<?php
namespace App\Support;

use App\Models\PropertySetting;
use App\Models\Role;
use Illuminate\Support\Facades\Log;

class TenantProvisioner {
    private const ROLE_DEFAULTS = [
        'Owner'   => ['*'],
        'Admin'   => ['*'],
        'Manager' => [
            '/dashboard', '/owner', '/rack', '/calendar', '/bookings', '/groups', '/checkin', '/checkout',
            '/enquiries', '/guests', '/loyalty', '/folio', '/halls', '/food', '/housekeeping', '/maintenance',
            '/lost-found', '/agents', '/accounts', '/pricing', '/cashier', '/inventory', '/vendors', '/staff',
            '/channels', '/website', '/notifications', '/night-audit', '/reports', '/setup', '/users',
            '/audit-logs', '/compliance', '/checkout/express', '/revenue/pace', '/revenue/pickup',
            '/revenue/restrictions', '/revenue/group-quote', '/revenue/comp-shop',
        ],
        'Reception' => [
            '/dashboard', '/rack', '/calendar', '/bookings', '/groups', '/checkin', '/checkout',
            '/enquiries', '/guests', '/folio', '/cashier', '/food', '/halls', '/checkout/express',
        ],
        'Housekeeping' => ['/dashboard', '/rack', '/housekeeping', '/maintenance', '/lost-found'],
        'Accounts'     => ['/dashboard', '/folio', '/accounts', '/cashier', '/reports', '/revenue/pace', '/revenue/pickup'],
        'Restaurant'   => ['/dashboard', '/food', '/halls', '/fb/pos', '/fb/kds', '/fb/recipes', '/fb/beo', '/fb/tables', '/fb/bar'],
        'Maintenance'  => ['/dashboard', '/maintenance', '/lost-found'],
    ];

    public static function ensure(int $companyId): void {
        try {
            if (!PropertySetting::withoutGlobalScope('company')->where('company_id', $companyId)->exists()) {
                $p = new PropertySetting();
                $p->company_id = $companyId;
                $p->save();
            }
        } catch (\Throwable $e) {
            Log::warning("TenantProvisioner property failed for company {$companyId}: " . $e->getMessage());
        }
        try {
            if (!Role::withoutGlobalScope('company')->where('company_id', $companyId)->exists()) {
                foreach (self::ROLE_DEFAULTS as $name => $pages) {
                    $r = new Role();
                    $r->company_id = $companyId;
                    $r->name = $name;
                    $r->permissions = $pages;
                    $r->save();
                }
            }
        } catch (\Throwable $e) {
            Log::warning("TenantProvisioner roles failed for company {$companyId}: " . $e->getMessage());
        }
    }
}
