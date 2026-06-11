<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * BSP-approved WhatsApp messaging templates for the Notifications > Templates
 * screen. Mirrors the SEED_TEMPLATES array from the frontend page. The client
 * 'id' is dropped; 'buttons' is stored as a JSON column.
 */
class WhatsappTemplateSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('whatsapp_templates')->count() > 0) {
            return;
        }

        $templates = [
            [
                'name' => 'booking_confirmation_v3',
                'status' => 'Approved',
                'category' => 'Booking',
                'language' => 'English',
                'header' => 'Booking Confirmed at The Pearl Marina',
                'body' => 'Dear {{1}}, your booking {{2}} is confirmed for check-in on {{3}}. Room: {{4}}. Total: {{5}}. We look forward to hosting you!',
                'footer' => 'The Pearl Marina · Mumbai',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'View Booking', 'value' => 'https://pearlmarina.com/b/{{2}}'],
                    ['id' => 'b2', 'type' => 'Phone', 'text' => 'Call Concierge', 'value' => '+912226001234'],
                ],
                'lastEdited' => '2026-05-28T14:22:00',
                'editedBy' => 'Rohan Sethi',
                'usage30d' => 1842,
                'submittedOn' => '2026-04-12',
            ],
            [
                'name' => 'checkin_otp',
                'status' => 'Approved',
                'category' => 'Utility',
                'language' => 'English',
                'body' => 'Hi {{1}}, your check-in OTP for booking {{2}} is {{3}}. Valid for 10 minutes. Please share this at the reception.',
                'footer' => 'Do not share this OTP with anyone',
                'buttons' => [],
                'lastEdited' => '2026-05-30T09:15:00',
                'editedBy' => 'Priya Krishnan',
                'usage30d' => 967,
                'submittedOn' => '2026-03-08',
            ],
            [
                'name' => 'monsoon_offer_2026',
                'status' => 'Pending',
                'category' => 'Marketing',
                'language' => 'English',
                'header' => 'Monsoon Magic · Up to 35% Off',
                'body' => 'Dear {{1}}, escape to The Pearl Marina this monsoon. Suites from {{2}}/night incl. breakfast & spa credit. Book by 15 June.',
                'footer' => 'Reply STOP to opt out',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'Book Now', 'value' => 'https://pearlmarina.com/monsoon'],
                    ['id' => 'b2', 'type' => 'Quick Reply', 'text' => 'Send Brochure'],
                ],
                'lastEdited' => '2026-06-01T11:40:00',
                'editedBy' => 'Karan Mehta',
                'usage30d' => 0,
                'submittedOn' => '2026-06-01',
            ],
            [
                'name' => 'checkout_reminder_hi',
                'status' => 'Approved',
                'category' => 'Booking',
                'language' => 'Hindi',
                'body' => 'Namaste {{1}}, aapka check-out aaj {{2}} baje hai. Late check-out ke liye reception se sampark karein. Booking: {{3}}',
                'footer' => 'The Pearl Marina · Mumbai',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'Quick Reply', 'text' => 'Request Late Checkout'],
                    ['id' => 'b2', 'type' => 'Phone', 'text' => 'Call Reception', 'value' => '+912226001234'],
                ],
                'lastEdited' => '2026-05-25T16:08:00',
                'editedBy' => 'Anjali Iyer',
                'usage30d' => 423,
                'submittedOn' => '2026-02-19',
            ],
            [
                'name' => 'payment_link',
                'status' => 'Approved',
                'category' => 'Utility',
                'language' => 'English',
                'header' => 'Payment Pending',
                'body' => 'Dear {{1}}, a payment of {{2}} is pending for booking {{3}}. Please complete payment by 6 PM today to confirm your reservation.',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'Pay Now', 'value' => 'https://pay.pearlmarina.com/{{3}}'],
                ],
                'lastEdited' => '2026-05-29T18:50:00',
                'editedBy' => 'Rohan Sethi',
                'usage30d' => 612,
                'submittedOn' => '2026-03-22',
            ],
            [
                'name' => 'diwali_greetings_mr',
                'status' => 'Rejected',
                'category' => 'Marketing',
                'language' => 'Marathi',
                'header' => 'Shubh Diwali!',
                'body' => 'Priya {{1}}, The Pearl Marina kadun Diwali chya hardik shubhechha! Khaas suite offer: {{2}}. Aaple swagat ahe.',
                'footer' => 'Reply STOP to opt out',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'View Offer', 'value' => 'https://pearlmarina.com/diwali'],
                ],
                'rejectionReason' => 'Marketing template contains promotional content without an opt-out hyperlink. Please add a clear opt-out URL or remove promotional pricing.',
                'lastEdited' => '2026-05-20T10:30:00',
                'editedBy' => 'Karan Mehta',
                'usage30d' => 0,
                'submittedOn' => '2026-05-18',
            ],
            [
                'name' => 'feedback_request',
                'status' => 'Approved',
                'category' => 'Utility',
                'language' => 'English',
                'body' => 'Hi {{1}}, thanks for staying at The Pearl Marina! How was your experience in {{2}}? Your feedback helps us serve you better.',
                'footer' => 'Takes under 30 seconds',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'Rate Your Stay', 'value' => 'https://pearlmarina.com/feedback/{{2}}'],
                    ['id' => 'b2', 'type' => 'Quick Reply', 'text' => 'Not Now'],
                ],
                'lastEdited' => '2026-05-15T13:00:00',
                'editedBy' => 'Priya Krishnan',
                'usage30d' => 738,
                'submittedOn' => '2026-01-30',
            ],
            [
                'name' => 'spa_booking_confirm_hi',
                'status' => 'Approved',
                'category' => 'Booking',
                'language' => 'Hindi',
                'header' => 'Spa Booking Pushti',
                'body' => '{{1}} ji, aapka spa appointment {{2}} ko {{3}} baje confirmed hai. Therapy: {{4}}. Pre-arrival 15 min pehle pohchein.',
                'footer' => 'Pearl Spa · Level 3',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'Quick Reply', 'text' => 'Reschedule'],
                    ['id' => 'b2', 'type' => 'Phone', 'text' => 'Call Spa', 'value' => '+912226001245'],
                ],
                'lastEdited' => '2026-05-31T08:20:00',
                'editedBy' => 'Anjali Iyer',
                'usage30d' => 184,
                'submittedOn' => '2026-04-02',
            ],
            [
                'name' => 'loyalty_tier_upgrade',
                'status' => 'Pending',
                'category' => 'Marketing',
                'language' => 'English',
                'header' => "You're now Pearl Gold!",
                'body' => "Congrats {{1}}! You've been upgraded to Pearl Gold. Enjoy room upgrades, late check-out & {{2}} in F&B credit on your next stay.",
                'footer' => 'Pearl Rewards · The Pearl Marina',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'View Benefits', 'value' => 'https://pearlmarina.com/rewards'],
                    ['id' => 'b2', 'type' => 'Quick Reply', 'text' => 'Book a Stay'],
                ],
                'lastEdited' => '2026-06-02T07:45:00',
                'editedBy' => 'Karan Mehta',
                'usage30d' => 0,
                'submittedOn' => '2026-06-02',
            ],
            [
                'name' => 'booking_confirmation_mr',
                'status' => 'Approved',
                'category' => 'Booking',
                'language' => 'Marathi',
                'header' => 'Booking Pushti · The Pearl Marina',
                'body' => 'Namaskar {{1}}, tumchi booking {{2}} confirm zali ahe. Check-in: {{3}}. Room: {{4}}. Total: {{5}}. Tumcha swagat aahe!',
                'footer' => 'The Pearl Marina · Mumbai',
                'buttons' => [
                    ['id' => 'b1', 'type' => 'URL', 'text' => 'View Booking', 'value' => 'https://pearlmarina.com/b/{{2}}'],
                ],
                'lastEdited' => '2026-05-22T12:10:00',
                'editedBy' => 'Rohan Sethi',
                'usage30d' => 256,
                'submittedOn' => '2026-03-15',
            ],
        ];

        foreach ($templates as $tpl) {
            $tpl['buttons'] = json_encode($tpl['buttons'] ?? []);
            $tpl['created_at'] = now();
            $tpl['updated_at'] = now();
            DB::table('whatsapp_templates')->insert($tpl);
        }
    }
}
