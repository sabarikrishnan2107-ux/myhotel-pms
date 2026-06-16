<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Your Tax Invoice</h1>
          <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;">{{ $d['hotel'] ?? 'The Pearl Palace' }}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 12px;font-size:15px;">Dear {{ $d['guestName'] ?? 'Guest' }},</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
            Thank you for staying with us. Your tax invoice <strong>{{ $d['invoiceNo'] ?? '' }}</strong> is attached to this email as a PDF.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;width:100%;">
            <tr><td style="padding:14px 16px;font-size:14px;">
              <strong>Grand Total:</strong> ₹{{ number_format((float) ($d['grandTotal'] ?? 0)) }}
              @if (($d['balance'] ?? 0) > 0)
                &nbsp;·&nbsp; <span style="color:#b45309;"><strong>Balance due:</strong> ₹{{ number_format((float) $d['balance']) }}</span>
              @else
                &nbsp;·&nbsp; <span style="color:#15803d;font-weight:bold;">Paid in full</span>
              @endif
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Warm regards,<br><strong style="color:#374151;">{{ $d['hotel'] ?? 'The Pearl Palace' }}</strong></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Invoice PDF attached · The Pearl Palace PMS.</p>
    </td></tr>
  </table>
</body>
</html>
