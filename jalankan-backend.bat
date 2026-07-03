@echo off
title Dashboard SMT - Backend (Port 5000)
color 0E
echo.
echo  ================================================
echo    DASHBOARD SMT - Backend Server
echo  ================================================

:: Masuk ke folder BACKEND (bukan folder utama!)
cd /d "%~dp0backend"

echo  Folder aktif: %CD%
echo.

:: Cek apakah node_modules sudah ada
if not exist "node_modules" (
  echo  [INFO] node_modules belum ada, install dulu...
  call npm install
)

echo.
echo  Menjalankan backend server...
echo  Server berjalan di: http://localhost:5000
echo.
echo  JANGAN TUTUP jendela ini selama aplikasi dipakai!
echo  Tekan Ctrl+C untuk menghentikan server.
echo  ================================================
echo.

call npm run dev
pause
