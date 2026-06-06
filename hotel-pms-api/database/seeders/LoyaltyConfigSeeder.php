<?php

namespace Database\Seeders;

use App\Models\LoyaltyCampaign;
use App\Models\LoyaltyReward;
use App\Models\LoyaltyTier;
use Illuminate\Database\Seeder;

class LoyaltyConfigSeeder extends Seeder
{
    public function run(): void
    {
        if (LoyaltyTier::count() === 0) {
            foreach ([
                ['level' => 'Silver', 'minSpend' => 0, 'minNights' => 0, 'pointsRate' => 1, 'discountPct' => 0, 'roomUpgrade' => 'None', 'lateCheckout' => 'Standard 11 AM', 'earlyCheckin' => 'Standard 12 PM', 'freeBreakfast' => false, 'welcomeDrink' => true, 'priorityBooking' => false, 'vipTag' => false, 'color' => '#94a3b8', 'perks' => ['Welcome drink on arrival', '1 point per ₹100 spent', 'Member-only newsletter']],
                ['level' => 'Gold', 'minSpend' => 50000, 'minNights' => 5, 'pointsRate' => 1.5, 'discountPct' => 5, 'roomUpgrade' => 'Subject to availability', 'lateCheckout' => '1 PM', 'earlyCheckin' => '10 AM', 'freeBreakfast' => false, 'welcomeDrink' => true, 'priorityBooking' => false, 'vipTag' => false, 'color' => '#d4af37', 'perks' => ['Subject-to-availability room upgrade', '1 PM late checkout', '5% off F&B', 'Welcome amenity']],
                ['level' => 'Platinum', 'minSpend' => 200000, 'minNights' => 15, 'pointsRate' => 2, 'discountPct' => 10, 'roomUpgrade' => 'Subject to availability', 'lateCheckout' => '4 PM', 'earlyCheckin' => '8 AM', 'freeBreakfast' => true, 'welcomeDrink' => true, 'priorityBooking' => true, 'vipTag' => true, 'color' => '#9333ea', 'perks' => ['Complimentary breakfast for 2', '4 PM late checkout', 'Suite upgrade subject to availability', '10% off spa & F&B', 'Priority reservation queue']],
                ['level' => 'Diamond', 'minSpend' => 500000, 'minNights' => 30, 'pointsRate' => 3, 'discountPct' => 15, 'roomUpgrade' => 'Complimentary', 'lateCheckout' => '6 PM', 'earlyCheckin' => 'Guaranteed', 'freeBreakfast' => true, 'welcomeDrink' => true, 'priorityBooking' => true, 'vipTag' => true, 'color' => '#06b6d4', 'perks' => ['Complimentary room upgrade (1 cat.)', 'Guaranteed early check-in', '6 PM late checkout', 'Free breakfast & welcome dinner', 'Dedicated concierge line', 'Anniversary night every year', '15% off everything']],
            ] as $t) {
                LoyaltyTier::create($t);
            }
        }

        if (LoyaltyReward::count() === 0) {
            foreach ([
                ['name' => '₹500 room discount', 'category' => 'Stay', 'pointsCost' => 1000, 'cashValue' => 500, 'description' => 'Instant ₹500 off any room booking', 'minTier' => 'Silver', 'active' => true, 'icon' => '🏨'],
                ['name' => 'Free breakfast for 2', 'category' => 'F&B', 'pointsCost' => 800, 'cashValue' => 1200, 'description' => 'Buffet breakfast for 2 guests · valid 1 night', 'minTier' => 'Silver', 'active' => true, 'icon' => '🥐'],
                ['name' => 'Spa discount 20%', 'category' => 'Spa', 'pointsCost' => 600, 'cashValue' => 1000, 'description' => '20% off any spa treatment · single use', 'minTier' => 'Silver', 'active' => true, 'icon' => '💆'],
                ['name' => 'Late checkout till 4 PM', 'category' => 'Service', 'pointsCost' => 500, 'cashValue' => 750, 'description' => 'Extend checkout to 4 PM · subject to availability', 'minTier' => 'Silver', 'active' => true, 'icon' => '🕓'],
                ['name' => 'Room upgrade (1 cat.)', 'category' => 'Upgrade', 'pointsCost' => 2000, 'cashValue' => 4500, 'description' => 'Upgrade one category · subject to availability', 'minTier' => 'Gold', 'active' => true, 'icon' => '⬆️'],
                ['name' => 'Airport pickup', 'category' => 'Service', 'pointsCost' => 1500, 'cashValue' => 1800, 'description' => 'Sedan airport pickup or drop · within 25 km', 'minTier' => 'Gold', 'active' => true, 'icon' => '🚗'],
                ['name' => 'Free night (base)', 'category' => 'Stay', 'pointsCost' => 5000, 'cashValue' => 8500, 'description' => '1 complimentary night · base category · BBD basis', 'minTier' => 'Platinum', 'active' => true, 'icon' => '🎁'],
                ['name' => '₹1000 gift voucher', 'category' => 'Voucher', 'pointsCost' => 2000, 'cashValue' => 1000, 'description' => 'Hotel gift voucher · transferable', 'minTier' => 'Gold', 'active' => true, 'icon' => '🎟️'],
            ] as $r) {
                LoyaltyReward::create($r);
            }
        }

        if (LoyaltyCampaign::count() === 0) {
            foreach ([
                ['name' => 'Diwali Stay & Save', 'type' => 'Discount', 'description' => '20% off + 2× points for Diwali week', 'validFrom' => '2026-10-25', 'validTo' => '2026-11-05', 'applicableTiers' => ['Silver', 'Gold', 'Platinum', 'Diamond'], 'applicableRoomTypes' => ['All'], 'minBookingAmount' => 5000, 'rewardValue' => '20% off + 2× points', 'active' => true, 'redemptions' => 0],
                ['name' => 'Birthday Month Bonus', 'type' => 'Bonus Points', 'description' => 'Members get 500 bonus points + complimentary upgrade in their birthday month', 'validFrom' => '2026-01-01', 'validTo' => '2026-12-31', 'applicableTiers' => ['Silver', 'Gold', 'Platinum', 'Diamond'], 'applicableRoomTypes' => ['All'], 'minBookingAmount' => 0, 'rewardValue' => '+500 points · free upgrade', 'active' => true, 'redemptions' => 12],
                ['name' => 'Direct Booking Bonus', 'type' => 'Bonus Points', 'description' => '30% extra points when booking via hotel website or front desk (no OTA)', 'validFrom' => '2026-04-01', 'validTo' => '2026-12-31', 'applicableTiers' => ['Silver', 'Gold', 'Platinum', 'Diamond'], 'applicableRoomTypes' => ['All'], 'minBookingAmount' => 3000, 'rewardValue' => '+30% earning rate', 'active' => true, 'redemptions' => 47],
                ['name' => 'Stay 3 Nights, Get 1 Free', 'type' => 'Free Night', 'description' => 'Pay for 3, stay 4 (cheapest night free) · Sun-Thu only', 'validFrom' => '2026-06-01', 'validTo' => '2026-09-30', 'applicableTiers' => ['Gold', 'Platinum', 'Diamond'], 'applicableRoomTypes' => ['Deluxe', 'Suite'], 'minBookingAmount' => 12000, 'rewardValue' => '4th night free', 'active' => true, 'redemptions' => 8],
                ['name' => 'Weekend Getaway · Platinum+', 'type' => 'Discount', 'description' => 'Platinum & Diamond exclusive · 25% off weekend Suite rates', 'validFrom' => '2026-05-01', 'validTo' => '2026-12-31', 'applicableTiers' => ['Platinum', 'Diamond'], 'applicableRoomTypes' => ['Suite', 'Presidential'], 'minBookingAmount' => 0, 'rewardValue' => '25% off Sat-Sun', 'active' => true, 'redemptions' => 14],
            ] as $c) {
                LoyaltyCampaign::create($c);
            }
        }
    }
}
