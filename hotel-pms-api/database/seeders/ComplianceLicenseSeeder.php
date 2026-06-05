<?php

namespace Database\Seeders;

use App\Models\ComplianceLicense;
use Illuminate\Database\Seeder;

class ComplianceLicenseSeeder extends Seeder
{
    public function run(): void
    {
        if (ComplianceLicense::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'FSSAI Food License', 'authority' => 'FSSAI', 'number' => '10012042024500', 'issueDate' => '2024-06-15', 'expiryDate' => '2026-06-14', 'daysToExpiry' => 12, 'fee' => 7500, 'status' => 'expiring_soon', 'documents' => [['name' => 'FSSAI_certificate.pdf', 'uploadedAt' => '2024-06-20']], 'reminders' => [90, 60, 30, 15, 7]],
            ['name' => 'Excise / Bar License (FL3)', 'authority' => 'State Excise Dept', 'number' => 'EXC/MH/2024/4521', 'issueDate' => '2024-04-01', 'expiryDate' => '2026-03-31', 'daysToExpiry' => -62, 'fee' => 285000, 'status' => 'expired', 'documents' => [], 'reminders' => [90, 60, 30]],
            ['name' => 'Fire NOC', 'authority' => 'MFB Mumbai', 'number' => 'MFB/2024/8821', 'issueDate' => '2024-08-10', 'expiryDate' => '2027-08-09', 'daysToExpiry' => 433, 'fee' => 18500, 'status' => 'active', 'documents' => [['name' => 'Fire_NOC_renewal_2024.pdf', 'uploadedAt' => '2024-08-15']], 'reminders' => [90, 60, 30]],
            ['name' => 'Pollution NOC', 'authority' => 'MPCB', 'number' => 'MPCB/H/2023/1144', 'issueDate' => '2023-12-01', 'expiryDate' => '2026-11-30', 'daysToExpiry' => 181, 'fee' => 25000, 'status' => 'active', 'documents' => [['name' => 'MPCB_consent_2023.pdf', 'uploadedAt' => '2024-01-05']], 'reminders' => [90, 60, 30]],
            ['name' => 'Lift Inspection', 'authority' => 'Public Works Dept', 'number' => 'PWD/LFT/2025/512', 'issueDate' => '2025-02-20', 'expiryDate' => '2026-02-19', 'daysToExpiry' => -101, 'fee' => 4500, 'status' => 'expired', 'documents' => [], 'reminders' => [60, 30, 15]],
            ['name' => 'Trade License', 'authority' => 'BMC', 'number' => 'BMC/TR/H/4421', 'issueDate' => '2025-04-01', 'expiryDate' => '2026-03-31', 'daysToExpiry' => -62, 'fee' => 12000, 'status' => 'expired', 'documents' => [], 'reminders' => [60, 30, 15]],
            ['name' => 'Music License (PPL+IPRS)', 'authority' => 'PPL + IPRS', 'number' => 'PPL/2025/H/8911', 'issueDate' => '2025-01-15', 'expiryDate' => '2026-01-14', 'daysToExpiry' => -138, 'fee' => 85000, 'status' => 'expired', 'documents' => [['name' => 'PPL_invoice_2025.pdf', 'uploadedAt' => '2025-01-20']], 'reminders' => [60, 30]],
            ['name' => 'Shop & Establishment', 'authority' => 'Labour Dept', 'number' => 'SE/MH/B/01211', 'issueDate' => '2024-09-01', 'expiryDate' => '2027-08-31', 'daysToExpiry' => 455, 'fee' => 6500, 'status' => 'active', 'documents' => [['name' => 'SE_certificate.pdf', 'uploadedAt' => '2024-09-05']], 'reminders' => [90, 60]],
            ['name' => 'Property Tax (annual)', 'authority' => 'BMC', 'number' => 'PT/2026/H/4421', 'issueDate' => '2025-04-01', 'expiryDate' => '2026-03-31', 'daysToExpiry' => -62, 'fee' => 425000, 'status' => 'expired', 'documents' => [], 'reminders' => [60, 30, 15, 7]],
            ['name' => 'Boiler Inspection', 'authority' => 'Boiler Inspectorate', 'number' => 'BL/MH/2024/0987', 'issueDate' => '2024-11-10', 'expiryDate' => '2026-11-09', 'daysToExpiry' => 160, 'fee' => 15500, 'status' => 'active', 'documents' => [['name' => 'Boiler_cert.pdf', 'uploadedAt' => '2024-11-15']], 'reminders' => [60, 30]],
        ] as $l) {
            ComplianceLicense::create($l);
        }
    }
}
