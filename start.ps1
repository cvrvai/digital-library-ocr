# PaddleOCR Digital Library Studio - PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    PaddleOCR Digital Library & PDF Book Studio    " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Docker Database
Write-Host "[1/3] Ensuring Docker PostgreSQL database is running..." -ForegroundColor Yellow
try {
    docker compose up -d
    Write-Host "[OK] PostgreSQL database container active." -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Docker start error. Falling back to local SQLite database." -ForegroundColor Yellow
}
Write-Host ""

# 2. Check Python Environment
$PythonExe = Join-Path $ScriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "[ERROR] Virtual environment .venv not found at $PythonExe" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "[OK] Python environment verified." -ForegroundColor Green
Write-Host ""

# 3. Launch Web Server
Write-Host "[3/3] Starting Digital Library Web Server on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process "http://127.0.0.1:8000"

& $PythonExe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
