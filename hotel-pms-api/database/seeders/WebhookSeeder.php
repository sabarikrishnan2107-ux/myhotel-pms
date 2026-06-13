<?php

namespace Database\Seeders;

use App\Models\Webhook;
use Illuminate\Database\Seeder;

class WebhookSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['url' => 'https://hooks.pearlmarina.com/pms/bookings',   'events' => 'booking.created,booking.cancelled', 'status' => 'active'],
            ['url' => 'https://hooks.pearlmarina.com/pms/payments',   'events' => 'payment.received,invoice.paid',     'status' => 'active'],
            ['url' => 'https://crm.pearlmarina.com/webhooks/guest',   'events' => 'guest.created,guest.checkedout',    'status' => 'active'],
            ['url' => 'https://analytics.example.com/ingest/audit',   'events' => 'audit.completed',                   'status' => 'paused'],
        ];

        foreach ($rows as $row) {
            Webhook::firstOrCreate(['url' => $row['url']], $row);
        }
    }
}
