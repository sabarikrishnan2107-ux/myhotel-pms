@php
  $money = fn ($n) => '₹' . number_format((float) ($n ?? 0));
  $items = $d['items'] ?? [];
  $hotel = $d['hotel'] ?? 'The Pearl Palace';
@endphp
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { font-family: 'DejaVu Sans', sans-serif; }
    body { margin: 0; color: #1f2937; font-size: 12px; }
    .wrap { padding: 30px 34px; }
    .muted { color: #6b7280; }
    .hotel { font-size: 18px; font-weight: bold; color: #0f172a; }
    .title { font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 1px; }
    table { border-collapse: collapse; }
    .items { width: 100%; margin-top: 22px; }
    .items th { text-align: left; background: #0f172a; color: #fff; padding: 9px 12px; font-size: 11px; text-transform: uppercase; }
    .items td { padding: 9px 12px; border-bottom: 1px solid #eee; }
    .right { text-align: right; }
    .totals td { padding: 5px 12px; }
    .grand { font-size: 15px; font-weight: bold; color: #0f172a; }
    .badge { background: #ecfdf5; color: #15803d; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; }
  </style>
</head>
<body>
<div class="wrap">

  <!-- Header (table, not flex — dompdf has no flexbox) -->
  <table style="width:100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
    <tr>
      <td style="vertical-align: top;">
        <div class="hotel">{{ $hotel }}</div>
        <div class="muted" style="margin-top:2px;">Function Halls · Rooms · Banquets</div>
      </td>
      <td style="vertical-align: top; text-align: right;">
        <div class="title">INVOICE</div>
        <div class="muted" style="margin-top:4px;">{{ $d['invoiceNo'] ?? '' }}</div>
        <div class="muted">{{ $d['date'] ?? '' }}</div>
      </td>
    </tr>
  </table>

  <!-- Billed to -->
  <div style="margin-top: 18px;">
    <div class="muted" style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Billed to</div>
    <div style="font-weight:bold; font-size:13px; margin-top:2px;">{{ $d['guestName'] ?? 'Guest' }}</div>
  </div>

  <!-- Line items -->
  <table class="items">
    <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
    <tbody>
      @forelse ($items as $it)
        <tr><td>{{ $it['label'] ?? 'Charge' }}</td><td class="right">{{ $money($it['amount'] ?? 0) }}</td></tr>
      @empty
        <tr><td class="muted">Room &amp; folio charges</td><td class="right">{{ $money($d['subtotal'] ?? 0) }}</td></tr>
      @endforelse
    </tbody>
  </table>

  <!-- Totals (right-aligned via a nested table) -->
  <table style="width: 55%; margin-top: 14px; margin-left: 45%;" class="totals">
    <tr><td class="muted">Subtotal</td><td class="right">{{ $money($d['subtotal'] ?? 0) }}</td></tr>
    @if (($d['discount'] ?? 0) > 0)
      <tr><td class="muted">Discount</td><td class="right">- {{ $money($d['discount']) }}</td></tr>
    @endif
    <tr><td class="muted">Tax (GST)</td><td class="right">{{ $money($d['tax'] ?? 0) }}</td></tr>
    <tr style="border-top:1px solid #ddd;"><td class="grand">Grand Total</td><td class="right grand">{{ $money($d['grandTotal'] ?? 0) }}</td></tr>
    <tr><td class="muted">Paid @if (!empty($d['paymentMode']))· {{ $d['paymentMode'] }}@endif</td><td class="right">{{ $money($d['paid'] ?? 0) }}</td></tr>
    @if (($d['balance'] ?? 0) > 0)
      <tr><td style="color:#b45309; font-weight:bold;">Balance Due</td><td class="right" style="color:#b45309; font-weight:bold;">{{ $money($d['balance']) }}</td></tr>
    @else
      <tr><td></td><td class="right"><span class="badge">PAID IN FULL</span></td></tr>
    @endif
  </table>

  <div style="clear:both; margin-top: 70px; border-top: 1px solid #eee; padding-top: 14px;" class="muted">
    Thank you for choosing {{ $hotel }}. This is a computer-generated tax invoice and does not require a signature.
  </div>

</div>
</body>
</html>
