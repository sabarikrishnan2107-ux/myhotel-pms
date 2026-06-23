<?php
namespace App\Support;
use Illuminate\Support\Facades\Auth;

class Tenant {
    public static function id(): ?int {
        $u = Auth::user();
        return ($u !== null && $u->company_id !== null) ? (int) $u->company_id : null;
    }
}
