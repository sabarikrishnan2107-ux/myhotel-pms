@echo off
title MyHotel PMS — Starting servers...

echo Starting Laravel API (port 8000)...
start "API :8000" cmd /k "cd /d "D:\transfer the file\Downloads\myhotel-pms-source\hotel-pms-api" && C:\php84\php.exe artisan serve --port=8000"

echo Starting Next.js frontend (port 3000)...
start "Frontend :3000" cmd /k "cd /d "D:\transfer the file\Downloads\myhotel-pms-source\luxe-pms" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   API      → http://localhost:8000
echo   Frontend → http://localhost:3000
echo.
timeout /t 5 /nobreak >nul
start http://localhost:3000
