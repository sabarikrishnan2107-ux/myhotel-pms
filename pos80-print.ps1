<#
  POS80 network receipt printer — direct ESC/POS over TCP port 9100.
  No driver, no browser. Works with any 80mm ESC/POS thermal printer on the LAN.

  USAGE:
    .\pos80-print.ps1 -PrinterIP 192.168.1.50
    .\pos80-print.ps1 -PrinterIP 192.168.1.50 -OpenDrawer
    .\pos80-print.ps1 -PrinterIP 192.168.1.50 -Port 9100

  Find the printer IP: print the self-test page (hold FEED while powering on),
  or check your router's DHCP client list.
#>

param(
  [Parameter(Mandatory = $true)] [string] $PrinterIP,
  [int]    $Port = 9100,
  [switch] $OpenDrawer
)

# ---- ESC/POS byte buffer + helpers ---------------------------------------
$ESC = 0x1B; $GS = 0x1D
$buf = New-Object System.Collections.Generic.List[byte]

function Raw([byte[]]$b) { $buf.AddRange($b) }
function Txt([string]$t) { $buf.AddRange([System.Text.Encoding]::ASCII.GetBytes($t)) }
function NL([int]$n = 1)  { for ($i = 0; $i -lt $n; $i++) { $buf.Add(0x0A) } }

function Center() { Raw @($ESC,0x61,0x01) }
function Left()   { Raw @($ESC,0x61,0x00) }
function Right()  { Raw @($ESC,0x61,0x02) }
function BoldOn() { Raw @($ESC,0x45,0x01) }
function BoldOff(){ Raw @($ESC,0x45,0x00) }
function BigOn()  { Raw @($GS,0x21,0x11) }   # double width + height
function BigOff() { Raw @($GS,0x21,0x00) }
function Rule()   { Left; Txt ('-' * 48); NL }   # 48 chars = full 80mm line (Font A)

# left text + right text padded to 48 columns
function Cols([string]$l, [string]$r) {
  $gap = 48 - $l.Length - $r.Length
  if ($gap -lt 1) { $gap = 1 }
  Txt ($l + (' ' * $gap) + $r); NL
}

# ---- Build the receipt ----------------------------------------------------
Raw @($ESC,0x40)                       # initialize printer

Center
BigOn;  Txt 'HYDER SPARK';            NL; BigOff
Txt '123 Banjara Hills Road No.12';   NL
Txt 'Hyderabad, TS - 500034';         NL
Txt 'Ph: +91 90000 12345';            NL
Txt 'GSTIN: 36ABCDE1234F1Z5';         NL
Rule
BoldOn; Txt 'TAX INVOICE'; NL; BoldOff
Rule

$now = Get-Date -Format 'dd/MM/yyyy  HH:mm'
Left
Cols 'Bill No'      'INV-000128'
Cols 'Date'         $now
Cols 'Cashier'      'Reception 1'
Cols 'Guest'        'Rajesh Kumar'
Cols 'Room / Folio' '401 / F-2207'
Cols 'Stay'         '26 Jun-28 Jun (2N)'
Rule

# items: name + amount, with a muted qty line under each
Cols 'Room Charge - Suite'   '30,000.00'
Txt  '   2 nights x 15,000.00'; NL
Cols 'Restaurant - Dinner'   '2,400.00'
Cols 'Laundry'               '650.00'
Cols 'Mini Bar (3)'          '1,050.00'
Rule

Cols 'Subtotal'   '34,100.00'
Cols 'CGST @ 6%'  '2,046.00'
Cols 'SGST @ 6%'  '2,046.00'
Cols 'Round Off'  '-0.00'
Rule
BoldOn; Cols 'GRAND TOTAL'  'Rs. 38,192.00'; BoldOff
Rule
Cols 'Paid - UPI'  '38,192.00'
Cols 'Balance'     '0.00'
Rule

Center
Txt 'Thank you for staying with us!'; NL
Txt 'Check-out before 11:00 AM';      NL
NL
Txt '*** Computer generated receipt ***'; NL

NL 4                                   # feed before cut
Raw @($GS,0x56,0x42,0x00)              # GS V 66 0 : feed + partial cut

if ($OpenDrawer) {
  Raw @($ESC,0x70,0x00,0x19,0xFA)      # ESC p 0 25 250 : kick cash drawer pin 2
}

# ---- Send to printer over the network ------------------------------------
Write-Host "Connecting to $PrinterIP`:$Port ..."
try {
  $client = New-Object System.Net.Sockets.TcpClient
  $client.Connect($PrinterIP, $Port)
  $stream = $client.GetStream()
  $bytes  = $buf.ToArray()
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Flush()
  Start-Sleep -Milliseconds 300
  $stream.Close(); $client.Close()
  Write-Host "Sent $($bytes.Length) bytes - receipt printed." -ForegroundColor Green
}
catch {
  Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Check: printer is ON, on the same network, and port $Port is open." -ForegroundColor Yellow
}
