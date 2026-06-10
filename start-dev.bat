@echo off
REM ============================================================
REM  myhotel PMS - start BOTH servers together (Windows)
REM    Backend API : http://localhost:8000  (Laravel)
REM    Frontend app: http://localhost:3000  (Next.js)
REM  Double-click this file, or run:  start-dev.bat
REM ============================================================

echo Starting myhotel PMS...

REM --- Backend (PHP 8.4 / Laravel) ---
start "PMS Backend :8000" cmd /k "cd /d %~dp0hotel-pms-api && C:\php84\php.exe artisan serve --host=127.0.0.1 --port=8000"

REM give the API a moment to boot before the app starts polling it
timeout /t 2 /nobreak >nul

REM --- Frontend (Next.js) ---
start "PMS Frontend :3000" cmd /k "cd /d %~dp0luxe-pms && npm run dev"

echo.
echo Both servers are launching in their own windows:
echo    Backend : http://localhost:8000
echo    App     : http://localhost:3000
echo.
echo Close those two windows to stop the servers.
echo (If PHP is not at C:\php84\php.exe, edit the path in this file.)
