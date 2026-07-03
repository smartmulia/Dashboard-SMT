@echo off
title Fix Prisma - Generate Client
color 0C
echo.
echo  ================================================
echo    FIX PRISMA - Generate Ulang Client
echo  ================================================
echo.
echo  LANGKAH 1: Hentikan backend server dulu!
echo  (Tekan Ctrl+C di terminal backend, lalu kembali ke sini)
echo.
pause

cd /d "%~dp0backend"
echo.
echo  LANGKAH 2: Generate Prisma Client baru...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Generate gagal. Pastikan backend sudah dihentikan!
  pause
  exit /b 1
)

echo.
echo  ================================================
echo    Berhasil! Sekarang jalankan ulang backend:
echo    Klik: jalankan-backend.bat
echo  ================================================
echo.
pause
