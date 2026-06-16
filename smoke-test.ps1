$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000/api"

# ---- login ----
$login = Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType "application/json" `
  -Body (@{ email = "admin@hotel.com"; password = "password123" } | ConvertTo-Json)
$token = $login.token
if (-not $token) { Write-Output "LOGIN FAILED"; exit 1 }
Write-Output "LOGIN OK as $($login.user.email)"
$H = @{ Authorization = "Bearer $token"; Accept = "application/json" }

$resources = @(
  'floors','rooms','room-types','rate-plans','seasons','holidays','fb-packages','hall-packages',
  'agents','gst-slabs','payment-methods','notification-templates','roles','webhooks','guests',
  'bookings','folio-charges','folio-payments','staff','vendors','inventory-items','menu-items',
  'fb-orders','maintenance-tickets','enquiries','found-items','loyalty-members','loyalty-tiers',
  'loyalty-rewards','loyalty-campaigns','account-entries','app-users','hall-bookings','group-bookings',
  'group-rooming','compliance-licenses','form-c-registrations','channels','web-rooms','pricing-rules',
  'email-schedules','linen-items','lost-reports','banquet-orders','table-reservations','table-waitlist',
  'maintenance-schedules','amc-contracts','pos-tables','recipes','bar-items','bar-pour-costs',
  'bar-variances','bar-purchase-orders','bar-cocktails','loyalty-redemptions','loyalty-transactions',
  'loyalty-earning-rules','loyalty-settings','inventory-purchases','stock-movements','purchase-orders',
  'inventory-wastage','ota-bookings','channel-rate-maps','channel-sync-logs','gst-returns','tds-entries',
  'audit-runs','whatsapp-templates','agent-ledger'
)
$special = @(
  'me','property','stats','room-board','audit-logs','shift/current','backups',
  'dashboard/alerts','dashboard/goals','dashboard/occupancy-forecast','dashboard/revenue-trend',
  'revenue/pace','revenue/pickup','owner/flash','owner/flash-insights','owner/flash-trend'
)

$empty = @(); $fail = @(); $ok = 0
function Probe($path) {
  $url = "$base/$path"
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $H -UseBasicParsing -TimeoutSec 20
    $json = $r.Content | ConvertFrom-Json
    $count = if ($json -is [array]) { $json.Count } elseif ($null -ne $json) { 1 } else { 0 }
    return [pscustomobject]@{ path=$path; status=$r.StatusCode; count=$count; err=$null }
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return [pscustomobject]@{ path=$path; status=$code; count=0; err=$_.Exception.Message }
  }
}

Write-Output "`n=== RESOURCES ==="
foreach ($p in $resources) {
  $res = Probe $p
  if ($res.err) { $fail += $res; Write-Output ("FAIL [{0}] {1} :: {2}" -f $res.status,$p,$res.err) }
  elseif ($res.count -eq 0) { $empty += $res; Write-Output ("EMPTY [200] {0}" -f $p) }
  else { $ok++; }
}
Write-Output "`n=== SPECIAL ==="
foreach ($p in $special) {
  $res = Probe $p
  if ($res.err) { $fail += $res; Write-Output ("FAIL [{0}] {1} :: {2}" -f $res.status,$p,$res.err) }
  elseif ($res.count -eq 0) { $empty += $res; Write-Output ("EMPTY [200] {0}" -f $p) }
  else { $ok++; }
}

Write-Output "`n=== SUMMARY ==="
Write-Output ("OK (non-empty 200): {0}" -f $ok)
Write-Output ("EMPTY: {0} -> {1}" -f $empty.Count, ($empty.path -join ', '))
Write-Output ("FAIL: {0} -> {1}" -f $fail.Count, ($fail.path -join ', '))
