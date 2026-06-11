<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  @php
    $balance = (int) $b->total - (int) $b->advance;
    $money = fn ($n) => '₹' . number_format((int) $n);
  @endphp
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Booking Confirmation</h1>
              <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;">The Pearl Palace · Function Halls &amp; Banquets</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 12px;font-size:15px;">Dear {{ $b->customer }},</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                Thank you for your booking. Here are your confirmed event details. Please review and contact us if anything needs to change.
              </p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;width:40%;">Hall</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;">{{ $b->hall }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;border-top:1px solid #f1f1f4;">Date</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #f1f1f4;">{{ $b->date }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;border-top:1px solid #f1f1f4;">Time</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #f1f1f4;">{{ $b->start }} – {{ $b->end }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;border-top:1px solid #f1f1f4;">Guests</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #f1f1f4;">{{ $b->guests }}</td>
                </tr>
                @if ($b->package)
                <tr>
                  <td style="padding:8px 0;color:#6b7280;border-top:1px solid #f1f1f4;">Package</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #f1f1f4;">{{ $b->package }}</td>
                </tr>
                @endif
              </table>
            </td>
          </tr>

          <!-- Payment -->
          <tr>
            <td style="padding:0 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;font-size:14px;">
                <tr>
                  <td style="padding:14px 16px 6px;color:#6b7280;">Total</td>
                  <td style="padding:14px 16px 6px;text-align:right;font-weight:600;">{{ $money($b->total) }}</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;color:#6b7280;">Advance received</td>
                  <td style="padding:6px 16px;text-align:right;font-weight:600;">{{ $money($b->advance) }}</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px 14px;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">{{ $balance > 0 ? 'Balance due' : 'Settled' }}</td>
                  <td style="padding:6px 16px 14px;text-align:right;font-weight:700;color:{{ $balance > 0 ? '#b45309' : '#15803d' }};border-top:1px solid #e5e7eb;">{{ $money(max(0, $balance)) }}</td>
                </tr>
              </table>
            </td>
          </tr>

          @if ($b->notes)
          <tr>
            <td style="padding:12px 32px;">
              <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Special instructions</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">{{ $b->notes }}</p>
            </td>
          </tr>
          @endif

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #f1f1f4;">
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                We look forward to hosting your event.<br>
                <strong style="color:#374151;">The Pearl Palace</strong> · Reservations
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">This is an automated confirmation from The Pearl Palace PMS.</p>
      </td>
    </tr>
  </table>
</body>
</html>
