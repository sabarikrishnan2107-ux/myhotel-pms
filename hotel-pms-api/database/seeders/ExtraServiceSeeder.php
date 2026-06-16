<?php

namespace Database\Seeders;

use App\Models\ExtraService;
use Illuminate\Database\Seeder;

/**
 * Add-on services for hall bookings (decor, AV, etc.). Editable in
 * Configuration → Food & Hall Packages. Transcribed from the former hardcoded
 * EXTRA_SERVICES list in halls/new.
 */
class ExtraServiceSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['label' => 'Decoration — Standard',                    'price' => 4500],
            ['label' => 'Decoration — Premium (florals + drapes)',  'price' => 12000],
            ['label' => 'AV & Stage — DJ, lights, projector',       'price' => 3800],
            ['label' => 'Photographer (4 hours)',                   'price' => 2500],
            ['label' => 'Valet parking — up to 100 cars',           'price' => 1800],
            ['label' => 'Extra security — 4 personnel',             'price' => 1200],
        ];
        foreach ($rows as $r) {
            ExtraService::firstOrCreate(['label' => $r['label']], $r + ['active' => true]);
        }
    }
}
