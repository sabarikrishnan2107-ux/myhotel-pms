<?php

namespace App\Support;

use Carbon\Carbon;

class CompanyStatus
{
    public static function derive(string $status, $validFrom, $validTo, Carbon $now): string
    {
        if ($status === 'suspended') return 'suspended';
        if ($validFrom === null || $validTo === null) return 'active';
        $from = Carbon::parse($validFrom)->startOfDay();
        $to   = Carbon::parse($validTo)->endOfDay();
        if ($now->lt($from)) return 'pending';
        if ($now->gt($to)) return 'expired';
        if ($now->diffInDays($to, false) <= 30) return 'expiring';
        return 'active';
    }
}
