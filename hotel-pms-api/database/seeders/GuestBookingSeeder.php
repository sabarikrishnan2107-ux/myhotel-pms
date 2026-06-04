<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guest;
use Illuminate\Database\Seeder;

class GuestBookingSeeder extends Seeder
{
    public function run(): void
    {
        if (Guest::count() === 0) {
            foreach ($this->guests() as $g) {
                Guest::create($g);
            }
        }
        if (Booking::count() === 0) {
            foreach ($this->bookings() as $b) {
                Booking::create($b);
            }
        }
    }

    private function guests(): array
    {
        return [
            ['name' => 'Rajesh Kumar', 'phone' => '+91 98765 43210', 'email' => 'rajesh.kumar@example.com', 'nationality' => 'India', 'idType' => 'Aadhaar', 'idNumber' => '1234 5678 9012', 'vip' => true, 'blacklist' => false, 'lifetimeNights' => 24, 'lifetimeSpend' => 480000, 'lastStay' => '2026-05-12', 'preferences' => ['Quiet room', 'Welcome drink'], 'allergies' => 'Peanuts', 'internalNotes' => 'Prefers late checkout (1pm). Books the heritage suite.', 'loyaltyPoints' => 6800],
            ['name' => 'Aisha Khan', 'phone' => '+91 91234 56789', 'email' => 'aisha.khan@example.com', 'nationality' => 'UAE', 'idType' => 'Passport', 'idNumber' => 'A1234567', 'vip' => false, 'blacklist' => false, 'lifetimeNights' => 8, 'lifetimeSpend' => 165000, 'lastStay' => '2026-04-20', 'preferences' => ['High floor', 'Sea view'], 'birthday' => '1988-06-01', 'loyaltyPoints' => 2450],
            ['name' => 'Michael Chen', 'phone' => '+65 8123 4567', 'email' => 'michael.chen@example.com', 'nationality' => 'Singapore', 'idType' => 'Passport', 'idNumber' => 'S9876543', 'vip' => false, 'blacklist' => false, 'lifetimeNights' => 3, 'lifetimeSpend' => 72000, 'lastStay' => '2026-03-15', 'birthday' => '1995-06-01', 'address' => 'Bandra West, Mumbai', 'loyaltyPoints' => 1020],
            ['name' => 'Priya Sharma', 'phone' => '+91 99887 76655', 'email' => 'priya.sharma@example.com', 'nationality' => 'India', 'idType' => 'PAN', 'idNumber' => 'ABCDE1234F', 'vip' => false, 'blacklist' => false, 'lifetimeNights' => 12, 'lifetimeSpend' => 240000, 'lastStay' => '2026-05-01', 'preferences' => ['Twin bed', 'Veg meal'], 'anniversary' => '2018-06-01', 'loyaltyPoints' => 3600],
            ['name' => 'James Wilson', 'phone' => '+44 7700 900123', 'email' => 'james.wilson@example.com', 'nationality' => 'UK', 'idType' => 'Passport', 'idNumber' => 'GBR123456', 'vip' => false, 'blacklist' => false, 'lifetimeNights' => 1, 'lifetimeSpend' => 28000, 'lastStay' => '2026-02-10', 'loyaltyPoints' => 380],
            ['name' => 'Fatima Al-Sayed', 'phone' => '+971 50 123 4567', 'email' => 'fatima.alsayed@example.com', 'nationality' => 'UAE', 'idType' => 'Passport', 'idNumber' => 'UAE998877', 'vip' => true, 'blacklist' => false, 'lifetimeNights' => 18, 'lifetimeSpend' => 540000, 'lastStay' => '2026-05-18', 'preferences' => ['Hypoallergenic pillow'], 'allergies' => 'Lactose intolerant', 'loyaltyPoints' => 5400],
            ['name' => 'David Okafor', 'phone' => '+234 803 123 4567', 'email' => 'david.okafor@example.com', 'nationality' => 'Nigeria', 'idType' => 'Passport', 'idNumber' => 'NGA445566', 'vip' => false, 'blacklist' => false, 'lifetimeNights' => 5, 'lifetimeSpend' => 98000, 'lastStay' => '2026-01-22', 'loyaltyPoints' => 1480],
            ['name' => 'Sofia Rossi', 'phone' => '+39 333 123 4567', 'email' => 'sofia.rossi@example.com', 'nationality' => 'Italy', 'idType' => 'Passport', 'idNumber' => 'ITA112233', 'vip' => false, 'blacklist' => false, 'lifetimeNights' => 2, 'lifetimeSpend' => 51000, 'lastStay' => '2026-03-30', 'loyaltyPoints' => 720],
        ];
    }

    private function bookings(): array
    {
        return [
            ['bookingNo' => 'BK100245', 'guestName' => 'Rajesh Kumar', 'roomNumber' => '401', 'roomType' => 'Suite', 'source' => 'Website', 'checkIn' => '2026-06-04', 'checkOut' => '2026-06-07', 'nights' => 3, 'adults' => 2, 'children' => 0, 'paymentStatus' => 'partial', 'ratePlan' => 'CP', 'total' => 54000, 'advance' => 16200, 'balance' => 37800, 'vip' => true],
            ['bookingNo' => 'BK100246', 'guestName' => 'Aisha Khan', 'roomNumber' => '301', 'roomType' => 'King', 'source' => 'OTA: Booking.com', 'checkIn' => '2026-06-05', 'checkOut' => '2026-06-08', 'nights' => 3, 'adults' => 1, 'children' => 0, 'paymentStatus' => 'paid', 'ratePlan' => 'EP', 'total' => 36000, 'advance' => 36000, 'balance' => 0, 'vip' => false],
            ['bookingNo' => 'BK100247', 'guestName' => 'Michael Chen', 'roomNumber' => '201', 'roomType' => 'Deluxe', 'source' => 'Phone', 'checkIn' => '2026-06-06', 'checkOut' => '2026-06-09', 'nights' => 3, 'adults' => 2, 'children' => 1, 'paymentStatus' => 'unpaid', 'ratePlan' => 'MAP', 'total' => 26400, 'advance' => 0, 'balance' => 26400, 'vip' => false],
            ['bookingNo' => 'BK100248', 'guestName' => 'Priya Sharma', 'roomNumber' => '103', 'roomType' => 'Deluxe', 'source' => 'Walk-in', 'checkIn' => '2026-06-04', 'checkOut' => '2026-06-06', 'nights' => 2, 'adults' => 2, 'children' => 0, 'paymentStatus' => 'partial', 'ratePlan' => 'CP', 'total' => 17000, 'advance' => 5100, 'balance' => 11900, 'vip' => false],
            ['bookingNo' => 'BK100249', 'guestName' => 'Fatima Al-Sayed', 'roomNumber' => 'PH1', 'roomType' => 'Presidential', 'source' => 'Corporate', 'checkIn' => '2026-06-07', 'checkOut' => '2026-06-10', 'nights' => 3, 'adults' => 2, 'children' => 2, 'paymentStatus' => 'paid', 'ratePlan' => 'AP', 'total' => 195000, 'advance' => 195000, 'balance' => 0, 'vip' => true],
            ['bookingNo' => 'BK100250', 'guestName' => 'James Wilson', 'roomNumber' => '202', 'roomType' => 'Deluxe', 'source' => 'OTA: Agoda', 'checkIn' => '2026-06-05', 'checkOut' => '2026-06-06', 'nights' => 1, 'adults' => 1, 'children' => 0, 'paymentStatus' => 'paid', 'ratePlan' => 'EP', 'total' => 8800, 'advance' => 8800, 'balance' => 0, 'vip' => false],
            ['bookingNo' => 'BK100251', 'guestName' => 'David Okafor', 'roomNumber' => '302', 'roomType' => 'King', 'source' => 'Agent', 'checkIn' => '2026-06-08', 'checkOut' => '2026-06-11', 'nights' => 3, 'adults' => 1, 'children' => 0, 'paymentStatus' => 'unpaid', 'ratePlan' => 'Corporate', 'total' => 36000, 'advance' => 0, 'balance' => 36000, 'vip' => false],
            ['bookingNo' => 'BK100252', 'guestName' => 'Sofia Rossi', 'roomNumber' => '101', 'roomType' => 'Queen', 'source' => 'Website', 'checkIn' => '2026-06-06', 'checkOut' => '2026-06-08', 'nights' => 2, 'adults' => 2, 'children' => 0, 'paymentStatus' => 'partial', 'ratePlan' => 'CP', 'total' => 13000, 'advance' => 3900, 'balance' => 9100, 'vip' => false],
        ];
    }
}
