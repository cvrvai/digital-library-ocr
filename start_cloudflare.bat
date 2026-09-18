@echo off
title PaddleOCR Cloudflare Tunnel Generator
cd /d "%~dp0"

echo ===================================================
echo     PaddleOCR Cloudflare Domain Tunnel Generator
echo ===================================================
echo.

set "CLOUDFLARED_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"

if not exist "%CLOUDFLARED_EXE%" (
    echo [ERROR] cloudflared.exe not found at %CLOUDFLARED_EXE%
    echo Please ensure Cloudflare Tunnel CLI is installed.
    pause
    exit /b 1
)

echo Starting Cloudflare Tunnel pointing to http://127.0.0.1:8000 ...
echo A public HTTPS domain on *.trycloudflare.com will be generated below.
echo Press Ctrl+C anytime to stop the tunnel.
echo =====================================================================
echo.

"%CLOUDFLARED_EXE%" tunnel --url http://127.0.0.1:8000
pause
