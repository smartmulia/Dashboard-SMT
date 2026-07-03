@echo off
title Dashboard SMT - Install Semua Package
color 0F
echo.
echo  ================================================
echo    DASHBOARD SMT - Install Package
echo    (Tanpa setup database)
echo  ================================================
echo.

:: ---- Install BACKEND ----
echo  [1/2] Install backend package...
cd /d "%~dp0backend"
echo  Folder: %CD%
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Install backend gagal!
  pause
  exit /b 1
)
echo  Backend package berhasil diinstall!
echo.

:: ---- Install FRONTEND ----
echo  [2/2] Install frontend package...
cd /d "%~dp0frontend"
echo  Folder: %CD%
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Install frontend gagal!
  pause
  exit /b 1
)
echo  Frontend package berhasil diinstall!
echo.

echo  ================================================
echo    Semua package berhasil diinstall!
echo.
echo    Langkah berikutnya:
echo    1. Pastikan MySQL aktif
echo    2. Jalankan setup-database.bat
echo       ATAU import file database\00_JALANKAN_SEMUA.sql
echo       ke phpMyAdmin, lalu edit backend\.env
echo    3. Klik jalankan-backend.bat
echo    4. Klik jalankan-frontend.bat (terminal baru)
echo  ================================================
echo.
pause
