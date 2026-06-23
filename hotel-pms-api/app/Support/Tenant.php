<?php
namespace App\Support;
use Illuminate\Support\Facades\Auth;

class Tenant {
    public static function id(): ?int {
        $u = Auth::user();
        return $u && isset($u->company_id) ? (int) $u->company_id : null;
    }
}
