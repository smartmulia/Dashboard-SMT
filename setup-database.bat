@echo off
title Dashboard SMT - Setup Database (Jalankan PERTAMA KALI)
color 0A
echo.
echo  ================================================
echo    DASHBOARD SMT - Setup Database
echo    Jalankan script ini SEKALI SAJA
echo  ================================================
echo.

:: Pastikan masuk ke folder BACKEND
cd /d "%~dp0backend"

echo  [1/4] Folder aktif: %CD%
echo.

echo  [2/4] Install package backend...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] npm install gagal! Pastikan Node.js sudah terinstall.
  echo  Download Node.js di: https://nodejs.org
  pause
  exit /b 1
)

echo.
echo  [3/4] Generate Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Prisma generate gagal!
  pause
  exit /b 1
)

echo.
echo  [4/4] Jalankan migrasi database...
echo  PASTIKAN MySQL sudah aktif dan DATABASE_URL di file .env sudah benar!
echo.
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Migrasi gagal!
  echo  Cek: backend\.env ^> DATABASE_URL sudah benar?
  echo  Cek: MySQL sudah berjalan?
  pause
  exit /b 1
)

echo.
echo  [5/5] Isi data awal (user admin)...
call node prisma/seed.js

echo.
echo  ================================================
echo    Setup SELESAI!
echo    Sekarang jalankan:
echo    1. jalankan-backend.bat
echo    2. jalankan-frontend.bat  (terminal baru)
echo  ================================================
echo.
pause
