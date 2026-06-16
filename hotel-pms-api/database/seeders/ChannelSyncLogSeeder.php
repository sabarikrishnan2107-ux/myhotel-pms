<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChannelSyncLogSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('channel_sync_logs')->count() > 0) {
            return;
        }

        $rows = [
            [
                'time'    => '13:42',
                'channel' => 'Booking.com',
                'action'  => 'Rates pushed',
                'detail'  => 'Deluxe AED 695 � 6 dates',
                'status'  => 'success',
            ],
            [
                'time'    => '13:35',
                'channel' => 'Booking.com',
                'action'  => 'Reservation received',
                'detail'  => 'BDC-44218 � 3N � Hans M�ller',
                'status'  => 'success',
            ],
            [
                'time'    => '13:30',
                'channel' => 'Agoda',
                'action'  => 'Availability pulled',
                'detail'  => 'All room types � 30 days',
                'status'  => 'success',
            ],
            [
                'time'    => '13:18',
                'channel' => 'Expedia',
                'action'  => 'Booking modified',
                'detail'  => 'EXP-99841 � dates pushed +1',
                'status'  => 'warning',
            ],
            [
                'time'    => '12:50',
                'channel' => 'Goibibo',
                'action'  => 'Connection retry',
                'detail'  => 'Token refresh succeeded',
                'status'  => 'warning',
            ],
            [
                'time'    => '12:30',
                'channel' => 'Airbnb',
                'action'  => 'Sync attempted',
                'detail'  => 'Channel disconnected � skipped',
                'status'  => 'error',
            ],
        ];

        foreach ($rows as &$row) {
            $row['created_at'] = now();
            $row['updated_at'] = now();
        }
        unset($row);

        DB::table('channel_sync_logs')->insert($rows);
    }
}
