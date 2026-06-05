<?php

namespace Database\Seeders;

use App\Models\Enquiry;
use App\Models\FoundItem;
use App\Models\MaintenanceTicket;
use Illuminate\Database\Seeder;

class OpsSeeder extends Seeder
{
    public function run(): void
    {
        if (MaintenanceTicket::count() === 0) {
            foreach ([
                ['code' => 'M-2401', 'room' => '305', 'title' => 'AC not cooling — guest complaint', 'priority' => 'urgent', 'status' => 'in-progress', 'assignee' => 'Ravi K.', 'reported' => '13:22', 'category' => 'HVAC'],
                ['code' => 'M-2400', 'room' => '412', 'title' => 'Bathroom faucet leaking', 'priority' => 'high', 'status' => 'assigned', 'assignee' => 'Ahmed F.', 'reported' => '11:50', 'category' => 'Plumbing'],
                ['code' => 'M-2399', 'room' => '208', 'title' => 'TV remote not working', 'priority' => 'low', 'status' => 'open', 'assignee' => null, 'reported' => '10:15', 'category' => 'Electronics'],
                ['code' => 'M-2398', 'room' => 'Lobby', 'title' => 'Marble polish required', 'priority' => 'medium', 'status' => 'open', 'assignee' => null, 'reported' => '09:00', 'category' => 'Cleaning'],
                ['code' => 'M-2397', 'room' => '501', 'title' => 'Door lock card reader issue', 'priority' => 'high', 'status' => 'resolved', 'assignee' => 'Joseph L.', 'reported' => 'Yesterday', 'category' => 'Access'],
                ['code' => 'M-2396', 'room' => 'Pool', 'title' => 'Pool filter pressure low', 'priority' => 'medium', 'status' => 'assigned', 'assignee' => 'Mahmoud S.', 'reported' => 'Yesterday', 'category' => 'Pool'],
            ] as $t) {
                MaintenanceTicket::create($t);
            }
        }

        if (Enquiry::count() === 0) {
            foreach ([
                ['enqNo' => 'ENQ-2026-1042', 'type' => 'Hall', 'name' => 'Rohan Mehta', 'phone' => '+91 98200 11223', 'email' => 'rohan@example.com', 'source' => 'Website', 'status' => 'negotiating', 'hallName' => 'Grand Ballroom', 'guestCount' => 280, 'eventDate' => '2026-07-12', 'budget' => 450000, 'quotedAmount' => 420000, 'enquiredOn' => '2026-05-17', 'assignedTo' => 'Priya S.', 'nextFollowUp' => '2026-06-06', 'followUps' => [], 'notes' => 'Wedding reception, wants AV package.', 'thankYouSent' => true, 'vip' => true],
                ['enqNo' => 'ENQ-2026-1041', 'type' => 'Room', 'name' => 'TechCorp HR', 'phone' => '+91 90000 55667', 'email' => 'hr@techcorp.in', 'company' => 'TechCorp', 'source' => 'Agent', 'status' => 'quoted', 'roomNights' => 30, 'roomCount' => 10, 'checkIn' => '2026-06-20', 'checkOut' => '2026-06-23', 'budget' => 300000, 'quotedAmount' => 285000, 'enquiredOn' => '2026-05-19', 'assignedTo' => 'Khalid R.', 'nextFollowUp' => '2026-06-05', 'followUps' => [], 'notes' => 'Corporate offsite, needs GST invoice.', 'thankYouSent' => true, 'vip' => false],
                ['enqNo' => 'ENQ-2026-1040', 'type' => 'Room', 'name' => 'Sneha Patel', 'phone' => '+91 91234 99887', 'email' => 'sneha@example.com', 'source' => 'WhatsApp', 'status' => 'new', 'roomNights' => 4, 'roomCount' => 1, 'checkIn' => '2026-06-15', 'checkOut' => '2026-06-19', 'budget' => 40000, 'enquiredOn' => '2026-06-03', 'assignedTo' => 'Priya S.', 'followUps' => [], 'notes' => 'Anniversary stay, sea-view preferred.', 'thankYouSent' => false, 'vip' => false],
            ] as $e) {
                Enquiry::create($e);
            }
        }

        if (FoundItem::count() === 0) {
            foreach ([
                ['name' => 'iPhone 15 Pro 256GB', 'brand' => 'Apple', 'color' => 'Titanium', 'qty' => 1, 'category' => 'Mobile phone', 'foundLocation' => 'Room 412 - Marina Suite', 'foundDate' => '2026-06-02', 'foundBy' => 'Maria Lopez', 'value' => 134900, 'hvi' => true, 'condition' => 'Excellent', 'description' => 'Found on bedside table', 'storageLocation' => 'Safe A', 'status' => 'Notified', 'daysHeld' => 3, 'guestName' => 'Rajesh Kumar', 'timeline' => []],
                ['name' => 'Gold Chain - 22kt 12gm', 'brand' => '', 'color' => 'Gold', 'qty' => 1, 'category' => 'Jewellery', 'foundLocation' => 'Spa Locker #14 - Aurora Spa', 'foundDate' => '2026-06-01', 'foundBy' => 'Aisha Mohamed', 'value' => 78400, 'hvi' => true, 'condition' => 'Good', 'description' => 'Found in spa locker', 'storageLocation' => 'Safe A', 'status' => 'Stored', 'daysHeld' => 4, 'timeline' => []],
                ['name' => 'Black Leather Wallet', 'color' => 'Black', 'qty' => 1, 'category' => 'Wallet', 'foundLocation' => 'Lobby Sofa', 'foundDate' => '2026-06-03', 'foundBy' => 'Khalid R.', 'value' => 2000, 'hvi' => false, 'condition' => 'Good', 'description' => 'No ID inside', 'storageLocation' => 'Drawer B', 'status' => 'Stored', 'daysHeld' => 2, 'timeline' => []],
            ] as $f) {
                FoundItem::create($f);
            }
        }
    }
}
