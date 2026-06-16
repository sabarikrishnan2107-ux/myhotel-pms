<?php

namespace Database\Seeders;

use App\Models\NotifTemplate;
use App\Models\NotifLog;
use Illuminate\Database\Seeder;

class NotificationContentSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            ['name' => 'Booking Confirmation',           'trigger' => 'On booking',          'channels' => ['Email', 'WhatsApp'],   'lastSent' => '12 today'],
            ['name' => 'Advance Payment Receipt',        'trigger' => 'On advance',          'channels' => ['Email'],               'lastSent' => '8 today'],
            ['name' => 'Pre-arrival Welcome',            'trigger' => '1 day before',        'channels' => ['Email', 'WhatsApp'],   'lastSent' => '5 today'],
            ['name' => 'Check-in Successful',            'trigger' => 'On check-in',         'channels' => ['WhatsApp'],            'lastSent' => '3 today'],
            ['name' => 'Checkout Reminder',              'trigger' => 'Morning of checkout', 'channels' => ['WhatsApp'],            'lastSent' => '5 today'],
            ['name' => 'Invoice',                        'trigger' => 'On checkout',         'channels' => ['Email'],               'lastSent' => '5 today'],
            ['name' => 'Feedback Request',               'trigger' => '1 day after',         'channels' => ['Email', 'WhatsApp'],   'lastSent' => '4 today'],
            ['name' => 'Cash Mismatch Alert (Manager)',  'trigger' => 'On variance',         'channels' => ['WhatsApp', 'Telegram'],'lastSent' => 'Yesterday'],
        ];
        foreach ($templates as $row) {
            NotifTemplate::firstOrCreate(['name' => $row['name']], $row);
        }

        $logs = [
            ['time' => '13:45', 'to' => 'Yuki Tanaka',     'channel' => 'WhatsApp', 'template' => 'Check-in Successful',   'status' => 'delivered'],
            ['time' => '13:30', 'to' => 'Sarah Whitfield', 'channel' => 'Email',    'template' => 'Pre-arrival Welcome',  'status' => 'delivered'],
            ['time' => '13:12', 'to' => 'Carlos Mendoza',  'channel' => 'Email',    'template' => 'Invoice',              'status' => 'opened'],
            ['time' => '12:50', 'to' => 'Priya Sharma',    'channel' => 'WhatsApp', 'template' => 'Booking Confirmation', 'status' => 'delivered'],
            ['time' => '12:18', 'to' => 'Khalid (Manager)','channel' => 'Telegram', 'template' => 'Cash Mismatch Alert',  'status' => 'delivered'],
            ['time' => '11:48', 'to' => 'Liu Wei',         'channel' => 'Email',    'template' => 'Feedback Request',     'status' => 'bounced'],
        ];
        foreach ($logs as $row) {
            NotifLog::firstOrCreate(['time' => $row['time'], 'to' => $row['to'], 'template' => $row['template']], $row);
        }
    }
}
