@echo off
title Digital Library OCR - Full Stack Launcher
cd /d "%~dp0"

echo ===================================================
echo     Digital Library OCR - AI Book Archiving Studio
echo ===================================================
echo.

:: 1. Check Python
set "PYTHON_EXE=python"
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\.venv\Scripts\python.exe"
)
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
)

:: 2. Launch FastAPI Backend
echo [1/2] Launching Backend Server on port 8080...
start "Digital Library Backend (FastAPI)" cmd /k "cd /d %~dp0backend && %PYTHON_EXE% -m uvicorn app:app --host 127.0.0.1 --port 8080 --reload"

:: 3. Launch React Frontend
echo [2/2] Launching Frontend Studio on port 5173...
start "Digital Library Frontend (Vite + React)" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 4. Open in browser after 2 seconds
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo [SUCCESS] Both Backend (:8080) and Frontend (:5173) are running!
echo Access the application in your browser: http://127.0.0.1:5173
echo.
pause
