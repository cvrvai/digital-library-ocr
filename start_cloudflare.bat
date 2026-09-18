@echo off
title Digital Library OCR - Cloudflare Tunnel
cd /d "%~dp0"

echo ===================================================
echo   Digital Library OCR - Cloudflare Domain Tunnel
echo ===================================================
echo.

:: 1. Locate cloudflared.exe
set "CLOUDFLARED_EXE="
if exist "C:\cloudflared\cloudflared.exe" set "CLOUDFLARED_EXE=C:\cloudflared\cloudflared.exe"
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" set "CLOUDFLARED_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if exist "C:\Program Files\cloudflared\cloudflared.exe" set "CLOUDFLARED_EXE=C:\Program Files\cloudflared\cloudflared.exe"
if not defined CLOUDFLARED_EXE (
    where cloudflared >nul 2>nul
    if %ERRORLEVEL% equ 0 set "CLOUDFLARED_EXE=cloudflared"
)

if not defined CLOUDFLARED_EXE (
    echo [ERROR] cloudflared.exe could not be found!
    echo Please install cloudflared or place it in C:\cloudflared\
    pause
    exit /b 1
)

:: 2. Check if Backend is running
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Backend is not running on port 8080. Starting backend now...
    set "PYTHON_EXE=python"
    if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=.venv\Scripts\python.exe"
    start "Digital Library Backend" cmd /k "cd /d %~dp0backend && %PYTHON_EXE% -m uvicorn app:app --host 127.0.0.1 --port 8080 --reload"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Backend is already running on port 8080.
)

echo.
echo [OK] Using: %CLOUDFLARED_EXE%
echo [INFO] Connecting to Cloudflare edge network...
echo [INFO] A public HTTPS URL on *.trycloudflare.com will be generated below:
echo ==============================================================================
echo.

"%CLOUDFLARED_EXE%" tunnel --url http://127.0.0.1:8080
pause
