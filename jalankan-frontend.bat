@echo off
title Dashboard SMT - Frontend (Port 5173)
color 0B
echo.
echo  ================================================
echo    DASHBOARD SMT - Frontend
echo  ================================================

:: Masuk ke folder FRONTEND (bukan folder utama!)
cd /d "%~dp0frontend"

echo  Folder aktif: %CD%
echo.

:: Cek apakah node_modules sudah ada
if not exist "node_modules" (
  echo  [INFO] node_modules belum ada, install dulu...
  call npm install
)

echo.
echo  Menjalankan frontend...
echo  Buka browser di: http://localhost:5173
echo.
echo  JANGAN TUTUP jendela ini selama aplikasi dipakai!
echo  Tekan Ctrl+C untuk menghentikan.
echo  ================================================
echo.

call npm run dev -- --open
pause
