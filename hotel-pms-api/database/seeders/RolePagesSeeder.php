<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Default page access per role. `permissions` holds the list of allowed page
 * keys (sidebar hrefs). Admin/Owner are treated as all-access in code, so they
 * are not restricted here. Hotels can tune these in Configuration → Roles.
 */
class RolePagesSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
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

        foreach ($defaults as $name => $pages) {
            $role = Role::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
            if ($role) {
                $role->permissions = $pages;
                $role->save();
            } else {
                Role::create(['name' => $name, 'permissions' => $pages]);
            }
        }
    }
}
