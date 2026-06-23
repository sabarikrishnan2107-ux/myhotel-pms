<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnsureCompanyModule {
    // resource slug => required module. Only list MODULE-GATED resources.
    // (front_office/core resources are NOT listed = always allowed.)
    private array $map = [
        // accounts
        'account-entries'   => 'accounts',
        'gst-returns'       => 'accounts',
        'tds-entries'       => 'accounts',
        'vendor-bills'      => 'accounts',
        'vendors'           => 'accounts',
        // pos / f&b
        'menu-items'        => 'pos',
        'pos-tables'        => 'pos',
        'recipes'           => 'pos',
        'fb-orders'         => 'pos',
        'bar-items'         => 'pos',
        'bar-cocktails'     => 'pos',
        'bar-pour-costs'    => 'pos',
        'bar-variances'     => 'pos',
        'bar-purchase-orders' => 'pos',
        // banquets
        'hall-bookings'     => 'banquets',
        'banquet-orders'    => 'banquets',
        'table-reservations' => 'banquets',
        'table-waitlist'    => 'banquets',
        'banquet-packages'  => 'banquets',
        // channel manager
        'channels'          => 'channel_mgr',
        'channel-rate-maps' => 'channel_mgr',
        'web-rooms'         => 'channel_mgr',
        'ota-bookings'      => 'channel_mgr',
        'channel-sync-logs' => 'channel_mgr',
        // housekeeping
        'housekeeping-tasks' => 'hk',
        'linen-items'       => 'hk',
        // hrms
        'staff'             => 'hrms',
    ];

    public function handle(Request $request, Closure $next, ?string $module = null) {
        $user = $request->user();
        if (!$user || !$user->company_id) return $next($request); // login gate covers null-company

        $company = DB::table('master_companies')->where('id', $user->company_id)->first();
        $raw = $company->modules ?? null;
        $modules = is_string($raw) ? (json_decode($raw, true) ?: []) : (array) ($raw ?? []);
        if (empty($modules)) return $next($request); // no module list = allow all (backward compatible)

        $required = $module;
        if (!$required) {
            $resource = $request->route('resource');
            $required = is_string($resource) ? ($this->map[$resource] ?? null) : null;
        }
        if ($required && !in_array($required, $modules, true)) {
            return response()->json([
                'message' => 'This module is not included in your plan.',
                'reason'  => 'module_not_licensed',
                'module'  => $required,
            ], 403);
        }
        return $next($request);
    }
}
