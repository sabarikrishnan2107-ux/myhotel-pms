<?php

namespace App\Http\Middleware;

use App\Support\CompanyStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnsureCompanyActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || !$user->company_id) {
            return $next($request);
        }

        $company = DB::table('master_companies')->where('id', $user->company_id)->first();
        if ($company) {
            $status = CompanyStatus::derive(
                $company->status ?? 'active',
                $company->valid_from,
                $company->valid_to,
                now()
            );
            if (in_array($status, ['suspended', 'expired', 'pending'], true)) {
                return response()->json([
                    'message' => 'Account access is blocked.',
                    'reason'  => $status === 'pending' ? 'before_valid_from' : $status,
                ], 403);
            }
        }

        return $next($request);
    }
}
