<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\HallBookingConfirmation;
use App\Models\AuditLog;
use App\Models\HallBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the booking-confirmation email for a hall booking. Triggered by the
 * "Email customer" action on the Hall Booking page. Sends synchronously so no
 * queue worker is required; the configured mail driver (.env MAIL_MAILER) does
 * the delivery — set it to `smtp` for live Gmail sending.
 */
class HallBookingMailController extends Controller
{
    public function send(Request $request, $id)
    {
        $booking = HallBooking::findOrFail($id);

        if (empty($booking->email)) {
            return response()->json(
                ['message' => 'No email address on file for this booking.'],
                422,
            );
        }

        Mail::to($booking->email)->send(new HallBookingConfirmation($booking));

        AuditLog::record([
            'module' => 'Halls',
            'action' => 'Email sent',
            'entity' => $booking->customer,
            'after'  => 'Confirmation emailed to ' . $booking->email,
        ], $request);

        return response()->json(['sent' => true, 'to' => $booking->email]);
    }
}
