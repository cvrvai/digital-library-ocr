# PaddleOCR Cloudflare Tunnel Generator - PowerShell
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    PaddleOCR Cloudflare Domain Tunnel Generator   " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$Cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

if (-not (Test-Path $Cloudflared)) {
    Write-Host "[ERROR] cloudflared.exe not found at $Cloudflared" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "Connecting to Cloudflare edge network..." -ForegroundColor Yellow
Write-Host "Forwarding public traffic to local server at http://127.0.0.1:8080" -ForegroundColor Gray
Write-Host "Your generated public domain will appear below in a few seconds..." -ForegroundColor Green
Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan

& $Cloudflared tunnel --url http://127.0.0.1:8080
