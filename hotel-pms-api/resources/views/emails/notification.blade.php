<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $heading }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">{{ $heading }}</h1>
              <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;">The Pearl Palace · Hospitality</p>
            </td>
          </tr>

          @if ($greeting)
          <tr>
            <td style="padding:28px 32px 4px;">
              <p style="margin:0;font-size:15px;">Dear {{ $greeting }},</p>
            </td>
          </tr>
          @endif

          @if ($intro)
          <tr>
            <td style="padding:{{ $greeting ? '12px' : '28px' }} 32px 8px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">{{ $intro }}</p>
            </td>
          </tr>
          @endif

          @if (!empty($rows))
          <tr>
            <td style="padding:16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                @foreach ($rows as $i => $row)
                <tr>
                  <td style="padding:8px 0;color:#6b7280;width:42%;{{ $i ? 'border-top:1px solid #f1f1f4;' : '' }}">{{ $row['label'] ?? '' }}</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;{{ $i ? 'border-top:1px solid #f1f1f4;' : '' }}">{{ $row['value'] ?? '' }}</td>
                </tr>
                @endforeach
              </table>
            </td>
          </tr>
          @endif

          @if ($note)
          <tr>
            <td style="padding:8px 32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;">
                <tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#374151;">{{ $note }}</td></tr>
              </table>
            </td>
          </tr>
          @endif

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #f1f1f4;">
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                Warm regards,<br>
                <strong style="color:#374151;">The Pearl Palace</strong>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Sent by The Pearl Palace PMS.</p>
      </td>
    </tr>
  </table>
</body>
</html>
