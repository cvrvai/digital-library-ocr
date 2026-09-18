# Digital Library OCR - Cloudflare Domain Tunnel Generator
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    Digital Library OCR - Cloudflare Domain Tunnel " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Locate cloudflared.exe
$Cloudflared = $null
$candidates = @(
    "C:\cloudflared\cloudflared.exe",
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe"
)
foreach ($c in $candidates) {
    if (Test-Path $c) {
        $Cloudflared = $c
        break
    }
}
if (-not $Cloudflared) {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) {
        $Cloudflared = $cmd.Source
    }
}

if (-not $Cloudflared) {
    Write-Host "[ERROR] cloudflared.exe not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# 2. Check if Backend is running
$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "[INFO] Backend is not running on port 8080. Starting it now..." -ForegroundColor Yellow
    $pythonExe = "python"
    if (Test-Path "$ScriptDir\.venv\Scripts\python.exe") {
        $pythonExe = "$ScriptDir\.venv\Scripts\python.exe"
    }
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; & '$pythonExe' -m uvicorn app:app --host 127.0.0.1 --port 8080 --reload"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[OK] Backend is already running on port 8080." -ForegroundColor Green
}

Write-Host ""
Write-Host "[OK] Cloudflare CLI: $Cloudflared" -ForegroundColor White
Write-Host "Connecting to Cloudflare edge network..." -ForegroundColor Yellow
Write-Host "Forwarding public traffic to local server at http://127.0.0.1:8080" -ForegroundColor Gray
Write-Host "Your generated public domain will appear below in a few seconds..." -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

& $Cloudflared tunnel --url http://127.0.0.1:8080
