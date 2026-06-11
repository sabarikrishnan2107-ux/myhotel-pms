<?php

namespace App\Mail;

use App\Models\HallBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Booking-confirmation email for a hall booking. Sent synchronously from
 * HallBookingMailController when the front-desk clicks "Email customer".
 */
class HallBookingConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public HallBooking $booking) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking Confirmation — ' . $this->booking->hall . ' on ' . $this->booking->date,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.hall-booking',
            with: ['b' => $this->booking],
        );
    }
}
