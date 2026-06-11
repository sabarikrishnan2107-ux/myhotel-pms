<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Generic branded notification email. Every "email customer/guest/staff" action
 * in the app routes through this one Mailable + the emails.notification view, so
 * they all send through the single configured mail account (.env MAIL_*).
 *
 * Content is fully data-driven: a heading, optional greeting/intro, a list of
 * label/value rows, and an optional note. The template escapes all values.
 */
class AppNotification extends Mailable
{
    use Queueable, SerializesModels;

    /** @param array<int,array{label:string,value?:string}> $rows */
    public function __construct(
        public string $subjectLine,
        public string $heading,
        public ?string $greeting = null,
        public ?string $intro = null,
        public array $rows = [],
        public ?string $note = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.notification',
            with: [
                'heading'  => $this->heading,
                'greeting' => $this->greeting,
                'intro'    => $this->intro,
                'rows'     => $this->rows,
                'note'     => $this->note,
            ],
        );
    }
}
