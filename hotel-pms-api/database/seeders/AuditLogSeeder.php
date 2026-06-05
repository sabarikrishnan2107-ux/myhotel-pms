<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        if (AuditLog::count() > 0) {
            return;
        }

        foreach ([
            ['user' => 'Khalid R.', 'module' => 'Folio', 'action' => 'Charge added', 'entity' => 'BK100245 / Spa', 'before' => '—', 'after' => 'AED 577.50', 'severity' => 'info'],
            ['user' => 'Khalid R.', 'module' => 'Check-in', 'action' => 'Guest checked in', 'entity' => 'BK100231 / Room 305', 'before' => 'Reserved', 'after' => 'Occupied', 'severity' => 'info'],
            ['user' => 'Khalid R.', 'module' => 'Payment', 'action' => 'Payment received', 'entity' => 'BK100221 / Cash', 'before' => '—', 'after' => 'AED 800', 'severity' => 'info'],
            ['user' => 'Khalid R.', 'module' => 'Folio', 'action' => 'Discount applied', 'entity' => 'BK100199 / 10%', 'before' => '0%', 'after' => '10%', 'severity' => 'warning'],
            ['user' => 'Tom W. (Mgr)', 'module' => 'Approval', 'action' => 'Discount approved', 'entity' => 'BK100199', 'before' => 'Pending', 'after' => 'Approved', 'severity' => 'warning'],
            ['user' => 'Aisha M.', 'module' => 'Housekeeping', 'action' => 'Room marked Ready', 'entity' => 'Room 412', 'before' => 'Inspected', 'after' => 'Ready', 'severity' => 'info'],
            ['user' => 'System', 'module' => 'Maintenance', 'action' => 'Ticket auto-created', 'entity' => 'M-2399 / Room 208', 'before' => '—', 'after' => 'Open', 'severity' => 'info'],
            ['user' => 'Sunil V.', 'module' => 'Inventory', 'action' => 'Stock issued', 'entity' => 'Bath Towels × 20', 'before' => '52', 'after' => '32', 'severity' => 'info'],
            ['user' => 'System', 'module' => 'Night Audit', 'action' => 'Audit completed', 'entity' => 'Run #4218', 'before' => '—', 'after' => 'Success', 'severity' => 'info'],
            ['user' => 'Fatima A.', 'module' => 'Vendor', 'action' => 'Vendor invoice paid', 'entity' => 'Pearl Textiles / L-4421', 'before' => 'Pending', 'after' => 'Paid', 'severity' => 'warning'],
        ] as $e) {
            AuditLog::create($e);
        }
    }
}
