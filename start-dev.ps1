# ============================================================
#  myhotel PMS - start BOTH servers together (PowerShell)
#    Backend API : http://localhost:8000  (Laravel)
#    Frontend app: http://localhost:3000  (Next.js)
#  Run:  powershell -ExecutionPolicy Bypass -File start-dev.ps1
# ============================================================

$root = $PSScriptRoot
$php  = "C:\php84\php.exe"   # change here if PHP lives elsewhere

Write-Host "Starting myhotel PMS..." -ForegroundColor Cyan

# Backend (Laravel) in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command",
  "Set-Location '$root\hotel-pms-api'; & '$php' artisan serve --host=127.0.0.1 --port=8000"

Start-Sleep -Seconds 2   # let the API boot before the app polls it

# Frontend (Next.js) in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command",
  "Set-Location '$root\luxe-pms'; npm run dev"

Write-Host "Backend : http://localhost:8000" -ForegroundColor Green
Write-Host "App     : http://localhost:3000" -ForegroundColor Green
Write-Host "Close the two new windows to stop the servers."
