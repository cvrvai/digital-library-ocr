# Digital Library OCR - Full Stack Launcher
$root = $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    Digital Library OCR - Full Stack Launcher      " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$pythonExe = "python"
if (Test-Path "$root\.venv\Scripts\python.exe") {
    $pythonExe = "$root\.venv\Scripts\python.exe"
}

Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8080..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; & '$pythonExe' -m uvicorn app:app --host 127.0.0.1 --port 8080 --reload"

Write-Host "[2/2] Starting React Frontend on http://127.0.0.1:5173..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173"

Write-Host ""
Write-Host "[SUCCESS] Digital Library OCR is active!" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8080" -ForegroundColor White
Write-Host ""
