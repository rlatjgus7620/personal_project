# One terminal: start the FastAPI server (8000) and the Next.js screen (3000) together.
# Run:  npm run dev:all      Stop: Ctrl + C (stops both)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# uv location and the SQLAlchemy option needed on this PC
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
$env:DISABLE_SQLALCHEMY_CEXT_RUNTIME = "1"

# Free port 3000 if an old screen server is still running
$old = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($old) {
    Write-Host "[dev-all] Port 3000 in use. Stopping old process $($old.OwningProcess)."
    Stop-Process -Id $old.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "[dev-all] Starting server  -> http://localhost:8000/docs"
$server = Start-Process -FilePath "uv" `
    -ArgumentList "run", "python", "-m", "fastapi", "dev", "app/main.py" `
    -WorkingDirectory (Join-Path $root "backend") `
    -NoNewWindow -PassThru

try {
    Write-Host "[dev-all] Starting screen  -> http://localhost:3000"
    Set-Location $root
    npm run dev
}
finally {
    # When the screen stops (Ctrl + C), stop the server and its child processes too
    Write-Host "[dev-all] Stopping server..."
    taskkill /PID $server.Id /T /F | Out-Null
}
