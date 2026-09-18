@echo off
title PaddleOCR Digital Library Studio
cd /d "%~dp0"

echo ===================================================
echo     PaddleOCR Digital Library ^& PDF Book Studio
echo ===================================================
echo.

:: 1. Ensure Docker Database is running
echo [1/3] Ensuring Docker PostgreSQL database is running...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Docker not running or failed. Falling back to local SQLite database.
) else (
    echo [OK] PostgreSQL database is active.
)
echo.

:: 2. Check virtual environment
echo [2/3] Checking Python virtual environment...
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment .venv not found!
    pause
    exit /b 1
)
echo [OK] Python environment found.
echo.

:: 3. Launch Web Application
echo [3/3] Starting Digital Library Web Server...
echo Opening application at http://127.0.0.1:8000
echo.

start "" "http://127.0.0.1:8000"
".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
