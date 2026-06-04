<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\FbPackage;
use App\Models\Floor;
use App\Models\GstSlab;
use App\Models\HallPackage;
use App\Models\Holiday;
use App\Models\NotificationTemplate;
use App\Models\PaymentMethod;
use App\Models\RatePlan;
use App\Models\Role;
use App\Models\Room;
use App\Models\Season;
use Illuminate\Database\Seeder;

/**
 * Loads the original frontend mock data into the Setup & Settings tables,
 * so the migrated app shows the same content it always did.
 */
class SetupDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->floors();
        $this->rooms();
        $this->ratePlans();
        $this->seasons();
        $this->holidays();
        $this->fbPackages();
        $this->hallPackages();
        $this->agents();
        $this->gstSlabs();
        $this->paymentMethods();
        $this->templates();
        $this->roles();
    }

    private function seed(string $model, array $rows): void
    {
        if ($model::count() === 0) {
            foreach ($rows as $row) {
                $model::create($row);
            }
        }
    }

    private function floors(): void
    {
        $this->seed(Floor::class, [
            ['number' => 0, 'name' => 'Ground', 'amenities' => ['Concierge desk', 'Service lift', 'CCTV'], 'smokingAllowed' => false, 'vipFloor' => false, 'hasElevator' => true, 'housekeepingZone' => 'Zone A', 'status' => 'active'],
            ['number' => 1, 'name' => '1st', 'amenities' => ['Ice machine', 'Pantry', 'Linen closet'], 'smokingAllowed' => false, 'vipFloor' => false, 'hasElevator' => true, 'housekeepingZone' => 'Zone A', 'status' => 'active'],
            ['number' => 2, 'name' => '2nd', 'amenities' => ['Vending', 'Pantry'], 'smokingAllowed' => false, 'vipFloor' => false, 'hasElevator' => true, 'housekeepingZone' => 'Zone B', 'status' => 'active'],
            ['number' => 3, 'name' => '3rd', 'amenities' => ['Pantry'], 'smokingAllowed' => true, 'vipFloor' => false, 'hasElevator' => true, 'housekeepingZone' => 'Zone B', 'status' => 'active'],
            ['number' => 4, 'name' => '4th', 'amenities' => ['Ice machine', 'Pantry'], 'smokingAllowed' => false, 'vipFloor' => true, 'hasElevator' => true, 'housekeepingZone' => 'Zone C', 'status' => 'active'],
            ['number' => 5, 'name' => '5th', 'amenities' => ['Pantry'], 'smokingAllowed' => false, 'vipFloor' => true, 'hasElevator' => true, 'housekeepingZone' => 'Zone C', 'status' => 'active'],
            ['number' => 6, 'name' => 'Penthouse', 'amenities' => ['Concierge desk', 'Pantry'], 'smokingAllowed' => false, 'vipFloor' => true, 'hasElevator' => true, 'housekeepingZone' => 'Zone D', 'status' => 'active'],
        ]);
    }

    private function room(string $num, int $floor, string $category, int $base, string $view, string $beds, int $sqft, array $amen, array $extra = []): array
    {
        return array_merge([
            'number' => $num, 'category' => $category, 'floor' => $floor,
            'bedConfig' => $beds,
            'maxAdults' => in_array($category, ['Suite', 'Presidential', 'Family']) ? 4 : 2,
            'maxChildren' => $category === 'Family' ? 2 : 1,
            'sizeSqft' => $sqft, 'view' => $view, 'baseTariff' => $base,
            'extraBedAllowed' => $category !== 'Queen', 'extraBedRate' => 1500,
            'connectingRoom' => '', 'extension' => '7' . $num, 'wifiSsid' => 'PearlGuest',
            'smoking' => false, 'accessible' => false, 'amenities' => $amen, 'status' => 'active',
        ], $extra);
    }

    private function rooms(): void
    {
        if (Room::count() > 0) {
            return;
        }
        $rows = [
            $this->room('101', 1, 'Queen', 6500, 'Garden', '1 Queen', 280, ['Smart TV', 'Mini-bar', 'In-room safe', 'Hair-dryer']),
            $this->room('102', 1, 'Queen', 6500, 'Garden', '1 Queen', 280, ['Smart TV', 'Mini-bar', 'Hair-dryer'], ['status' => 'out-of-order']),
            $this->room('103', 1, 'Deluxe', 8500, 'City', '1 King', 340, ['Smart TV', 'Mini-bar', 'In-room safe', 'Bath-tub', 'Bathrobe'], ['connectingRoom' => '104']),
            $this->room('104', 1, 'Deluxe', 8500, 'City', '2 Queens', 340, ['Smart TV', 'Mini-bar', 'In-room safe', 'Work desk'], ['accessible' => true, 'connectingRoom' => '103']),
            $this->room('201', 2, 'Deluxe', 8800, 'City', '1 King', 340, ['Smart TV', 'Mini-bar', 'Bath-tub', 'Balcony']),
            $this->room('202', 2, 'Deluxe', 8800, 'City', '1 King', 340, ['Smart TV', 'Mini-bar', 'Bath-tub']),
            $this->room('301', 3, 'King', 12000, 'Sea', '1 King', 420, ['Smart TV', 'Mini-bar', 'In-room safe', 'Rain shower', 'Balcony'], ['smoking' => true]),
            $this->room('302', 3, 'King', 12000, 'Sea', '1 King', 420, ['Smart TV', 'Mini-bar', 'Rain shower', 'Sit-out']),
            $this->room('401', 4, 'Suite', 18000, 'Sea', '1 King + 1 Sofa', 620, ['Smart TV', 'Mini-bar', 'In-room safe', 'Rain shower', 'Bath-tub', 'Work desk', 'Sofa', 'Balcony']),
            $this->room('402', 4, 'Suite', 18000, 'Sea', '1 King + 1 Sofa', 620, ['Smart TV', 'Mini-bar', 'Rain shower', 'Bath-tub', 'Walk-in closet']),
            $this->room('501', 5, 'Executive', 22000, 'Sea', '1 King', 480, ['Smart TV', 'Mini-bar', 'In-room safe', 'Work desk', 'Rain shower', 'Bathrobe'], ['status' => 'renovation']),
            $this->room('PH1', 6, 'Presidential', 65000, 'Sea', '1 King + 1 Sofa', 1450, ['Smart TV', 'Mini-bar', 'In-room safe', 'Rain shower', 'Bath-tub', 'Walk-in closet', 'Balcony', 'Sofa', 'Bathrobe', 'Slippers']),
        ];
        foreach ($rows as $r) {
            Room::create($r);
        }
    }

    private function ratePlans(): void
    {
        $this->seed(RatePlan::class, [
            ['code' => 'EP', 'name' => 'European Plan — Room only', 'inclBreakfast' => false, 'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 0, 'refundable' => true, 'active' => true],
            ['code' => 'CP', 'name' => 'Continental — Room + Breakfast', 'inclBreakfast' => true, 'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 0, 'refundable' => true, 'active' => true],
            ['code' => 'MAP', 'name' => 'Modified American — + 1 meal', 'inclBreakfast' => true, 'inclLunch' => false, 'inclDinner' => true, 'discountPct' => 0, 'refundable' => true, 'active' => true],
            ['code' => 'AP', 'name' => 'American — All meals', 'inclBreakfast' => true, 'inclLunch' => true, 'inclDinner' => true, 'discountPct' => 0, 'refundable' => true, 'active' => true],
            ['code' => 'CORP', 'name' => 'Corporate', 'inclBreakfast' => true, 'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 15, 'refundable' => true, 'active' => true],
            ['code' => 'NR', 'name' => 'Non-refundable', 'inclBreakfast' => true, 'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 20, 'refundable' => false, 'active' => true],
        ]);
    }

    private function seasons(): void
    {
        $this->seed(Season::class, [
            ['name' => 'Year-end peak', 'from' => '2026-12-20', 'to' => '2027-01-05', 'multiplier' => 1.5, 'active' => true],
            ['name' => 'Diwali week', 'from' => '2026-10-28', 'to' => '2026-11-05', 'multiplier' => 1.3, 'active' => true],
            ['name' => 'Monsoon off-peak', 'from' => '2026-06-01', 'to' => '2026-09-15', 'multiplier' => 0.8, 'active' => true],
        ]);
    }

    private function holidays(): void
    {
        $this->seed(Holiday::class, [
            ['name' => 'Republic Day', 'date' => '2027-01-26', 'kind' => 'national', 'surchargePct' => 10],
            ['name' => 'Holi', 'date' => '2027-03-14', 'kind' => 'religious', 'surchargePct' => 10],
            ['name' => 'Independence Day', 'date' => '2027-08-15', 'kind' => 'national', 'surchargePct' => 10],
            ['name' => 'Gandhi Jayanti', 'date' => '2027-10-02', 'kind' => 'national', 'surchargePct' => 5],
            ['name' => 'Diwali', 'date' => '2026-11-01', 'kind' => 'religious', 'surchargePct' => 25],
            ['name' => 'Christmas', 'date' => '2026-12-25', 'kind' => 'religious', 'surchargePct' => 15],
        ]);
    }

    private function fbPackages(): void
    {
        $this->seed(FbPackage::class, [
            ['name' => 'Continental Breakfast', 'type' => 'Breakfast', 'pax' => 1, 'price' => 450, 'gst' => 5, 'active' => true],
            ['name' => 'Buffet Lunch — Veg', 'type' => 'Lunch', 'pax' => 1, 'price' => 850, 'gst' => 5, 'active' => true],
            ['name' => 'Buffet Dinner — Mixed', 'type' => 'Dinner', 'pax' => 1, 'price' => 1200, 'gst' => 5, 'active' => true],
            ['name' => 'High Tea Platter', 'type' => 'High Tea', 'pax' => 1, 'price' => 650, 'gst' => 5, 'active' => true],
        ]);
    }

    private function hallPackages(): void
    {
        $this->seed(HallPackage::class, [
            ['name' => 'Banquet A · Wedding', 'capacity' => 300, 'hourly' => 8500, 'halfDay' => 38000, 'fullDay' => 72000, 'setupFee' => 5000, 'gst' => 18, 'active' => true],
            ['name' => 'Banquet B · Corporate', 'capacity' => 150, 'hourly' => 5500, 'halfDay' => 25000, 'fullDay' => 45000, 'setupFee' => 3500, 'gst' => 18, 'active' => true],
            ['name' => 'Garden Pavilion', 'capacity' => 200, 'hourly' => 7000, 'halfDay' => 30000, 'fullDay' => 55000, 'setupFee' => 4000, 'gst' => 18, 'active' => true],
            ['name' => 'Crystal Hall · Gala', 'capacity' => 500, 'hourly' => 12000, 'halfDay' => 55000, 'fullDay' => 110000, 'setupFee' => 8000, 'gst' => 18, 'active' => true],
            ['name' => 'Conference Room 1', 'capacity' => 40, 'hourly' => 1500, 'halfDay' => 6000, 'fullDay' => 11000, 'setupFee' => 800, 'gst' => 18, 'active' => true],
            ['name' => 'Conference Room 2', 'capacity' => 25, 'hourly' => 1000, 'halfDay' => 4000, 'fullDay' => 7500, 'setupFee' => 500, 'gst' => 18, 'active' => true],
        ]);
    }

    private function agents(): void
    {
        $this->seed(Agent::class, [
            ['type' => 'Agent', 'name' => 'ABC Travels', 'contact' => 'Mr. Sharma', 'phone' => '+91 98765 43210', 'email' => 'abc@travels.in', 'gstin' => '27ABCDE1234F1Z5', 'creditLimit' => 500000, 'commissionPct' => 12, 'creditTerms' => 'Net 30', 'active' => true],
            ['type' => 'Agent', 'name' => 'Pearl Holidays', 'contact' => 'Ms. Khalifa', 'phone' => '+91 91234 56789', 'email' => 'pearl@holidays.in', 'gstin' => '27FGHIJ5678K1Z6', 'creditLimit' => 300000, 'commissionPct' => 10, 'creditTerms' => 'Net 30', 'active' => true],
            ['type' => 'Agent', 'name' => 'Skyline Tours', 'contact' => 'Mr. Pereira', 'phone' => '+91 99887 76655', 'email' => 'info@skyline.in', 'gstin' => '27KLMNO9012P1Z7', 'creditLimit' => 400000, 'commissionPct' => 15, 'creditTerms' => 'Net 15', 'active' => true],
            ['type' => 'Corporate', 'name' => 'TechCorp FZ-LLC', 'contact' => 'HR Dept.', 'phone' => '+91 96543 21098', 'email' => 'travel@techcorp.in', 'gstin' => '27QRSTU3456V1Z8', 'creditLimit' => 1000000, 'commissionPct' => 0, 'creditTerms' => 'Net 30', 'active' => true],
            ['type' => 'Corporate', 'name' => 'Emirates Bank', 'contact' => 'Admin', 'phone' => '+91 95432 10987', 'email' => 'vendor@embank.in', 'gstin' => '27WXYZA7890B1Z9', 'creditLimit' => 800000, 'commissionPct' => 0, 'creditTerms' => 'Net 45', 'active' => true],
            ['type' => 'Corporate', 'name' => 'Global Oil Co.', 'contact' => 'Procurement', 'phone' => '+91 94321 09876', 'email' => 'po@globaloil.in', 'gstin' => '27CDEFG1234H1Z0', 'creditLimit' => 1500000, 'commissionPct' => 0, 'creditTerms' => 'Net 60', 'active' => true],
        ]);
    }

    private function gstSlabs(): void
    {
        $this->seed(GstSlab::class, [
            ['label' => 'Economy (≤ ₹1,000)', 'from' => 0, 'to' => 1000, 'rate' => 0],
            ['label' => 'Mid-range (₹1,001 – ₹7,500)', 'from' => 1001, 'to' => 7500, 'rate' => 12],
            ['label' => 'Luxury (> ₹7,500)', 'from' => 7501, 'to' => null, 'rate' => 18],
        ]);
    }

    private function paymentMethods(): void
    {
        $this->seed(PaymentMethod::class, [
            ['name' => 'Cash', 'code' => 'CASH', 'type' => 'Cash', 'feePct' => 0, 'settlement' => 'Cash drawer', 'active' => true],
            ['name' => 'UPI', 'code' => 'UPI', 'type' => 'Online', 'feePct' => 0, 'settlement' => 'HDFC Current A/c — 5012', 'active' => true],
            ['name' => 'Visa / MasterCard', 'code' => 'CARD', 'type' => 'Card', 'feePct' => 1.8, 'settlement' => 'HDFC Current A/c — 5012', 'active' => true],
            ['name' => 'American Express', 'code' => 'AMEX', 'type' => 'Card', 'feePct' => 2.5, 'settlement' => 'HDFC Current A/c — 5012', 'active' => true],
            ['name' => 'Net Banking', 'code' => 'NB', 'type' => 'Online', 'feePct' => 0.5, 'settlement' => 'HDFC Current A/c — 5012', 'active' => true],
            ['name' => 'NEFT / RTGS / IMPS', 'code' => 'BANK', 'type' => 'Bank', 'feePct' => 0, 'settlement' => 'HDFC Current A/c — 5012', 'active' => true],
            ['name' => 'Paytm', 'code' => 'PAYTM', 'type' => 'Online', 'feePct' => 1.2, 'settlement' => 'Paytm Business', 'active' => true],
            ['name' => 'PhonePe', 'code' => 'PPE', 'type' => 'Online', 'feePct' => 0, 'settlement' => 'Paytm Business', 'active' => true],
            ['name' => 'Razorpay (web)', 'code' => 'RZP', 'type' => 'Online', 'feePct' => 2.0, 'settlement' => 'Razorpay Auto-settle', 'active' => true],
            ['name' => 'Agent / Corporate Credit', 'code' => 'CREDIT', 'type' => 'Credit', 'feePct' => 0, 'settlement' => 'Per agreement', 'active' => true],
        ]);
    }

    private function templates(): void
    {
        $this->seed(NotificationTemplate::class, [
            ['event' => 'Booking Confirmation', 'channel' => 'Email', 'language' => 'English', 'active' => true],
            ['event' => 'Booking Confirmation', 'channel' => 'WhatsApp', 'language' => 'English', 'active' => true],
            ['event' => 'Booking Confirmation', 'channel' => 'WhatsApp', 'language' => 'Hindi', 'active' => true],
            ['event' => 'Pre-arrival Reminder (24h)', 'channel' => 'WhatsApp', 'language' => 'English', 'active' => true],
            ['event' => 'Check-in Welcome', 'channel' => 'WhatsApp', 'language' => 'English', 'active' => true],
            ['event' => 'Folio / Invoice', 'channel' => 'Email', 'language' => 'English', 'active' => true],
            ['event' => 'Checkout Thank-you', 'channel' => 'Email', 'language' => 'English', 'active' => true],
            ['event' => 'Birthday Greeting', 'channel' => 'WhatsApp', 'language' => 'English', 'active' => true],
            ['event' => 'Payment Receipt', 'channel' => 'WhatsApp', 'language' => 'English', 'active' => true],
            ['event' => 'Cancellation Notice', 'channel' => 'Email', 'language' => 'English', 'active' => false],
        ]);
    }

    private function roles(): void
    {
        $all = [
            'Bookings:Create', 'Bookings:Modify', 'Bookings:Cancel', 'Bookings:Reassign room', 'Bookings:Discount',
            'Folio:View', 'Folio:Add charge', 'Folio:Refund', 'Folio:Void', 'Folio:Apply credit',
            'Cashier:Open shift', 'Cashier:Close shift', 'Cashier:Cash drop', 'Cashier:Settle',
            'Reports:View all', 'Reports:Export', 'Reports:Audit logs',
            'Setup:Property', 'Setup:Rates', 'Setup:Users', 'Setup:Tax',
        ];
        $this->seed(Role::class, [
            ['name' => 'Owner', 'users' => 1, 'permissions' => $all, 'active' => true],
            ['name' => 'General Manager', 'users' => 1, 'permissions' => ['Bookings:Create', 'Bookings:Modify', 'Bookings:Cancel', 'Bookings:Reassign room', 'Bookings:Discount', 'Folio:View', 'Folio:Add charge', 'Folio:Refund', 'Folio:Void', 'Folio:Apply credit', 'Cashier:Open shift', 'Cashier:Close shift', 'Cashier:Settle', 'Reports:View all', 'Reports:Export', 'Reports:Audit logs', 'Setup:Rates', 'Setup:Users'], 'active' => true],
            ['name' => 'Front Desk Manager', 'users' => 2, 'permissions' => ['Bookings:Create', 'Bookings:Modify', 'Bookings:Cancel', 'Bookings:Reassign room', 'Folio:View', 'Folio:Add charge', 'Folio:Apply credit', 'Cashier:Open shift', 'Cashier:Close shift', 'Cashier:Settle', 'Reports:View all'], 'active' => true],
            ['name' => 'Reception', 'users' => 4, 'permissions' => ['Bookings:Create', 'Bookings:Modify', 'Folio:View', 'Folio:Add charge', 'Cashier:Open shift', 'Cashier:Close shift', 'Cashier:Settle'], 'active' => true],
            ['name' => 'Cashier', 'users' => 2, 'permissions' => ['Folio:View', 'Cashier:Open shift', 'Cashier:Close shift', 'Cashier:Cash drop', 'Cashier:Settle'], 'active' => true],
            ['name' => 'Accounts', 'users' => 2, 'permissions' => ['Folio:View', 'Folio:Refund', 'Folio:Void', 'Reports:View all', 'Reports:Export', 'Reports:Audit logs'], 'active' => true],
            ['name' => 'Housekeeping Supervisor', 'users' => 1, 'permissions' => ['Reports:View all'], 'active' => true],
            ['name' => 'Housekeeping', 'users' => 8, 'permissions' => [], 'active' => true],
            ['name' => 'F&B Manager', 'users' => 1, 'permissions' => ['Bookings:Discount', 'Folio:View', 'Folio:Add charge', 'Reports:View all'], 'active' => true],
            ['name' => 'Auditor (read-only)', 'users' => 1, 'permissions' => ['Reports:View all', 'Reports:Audit logs'], 'active' => true],
        ]);
    }
}
