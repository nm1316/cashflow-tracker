param(
    [switch]$Prod = $true
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $Root

Write-Host "=== Cashflow Tracker Deploy ===" -ForegroundColor Cyan

# Build
Write-Host "`n[1/3] Building..." -ForegroundColor Yellow
& "C:\Program Files\nodejs\npm.cmd" run build
if (-not $?) { throw "Build failed" }
Write-Host "Build OK" -ForegroundColor Green

# Deploy
Write-Host "`n[2/3] Deploying..." -ForegroundColor Yellow
$vercelArgs = @("vercel")
if ($Prod) { $vercelArgs += "--prod" }
$vercelArgs += "--yes"
& "C:\Program Files\nodejs\npx.cmd" @vercelArgs
if (-not $?) { throw "Deploy failed" }
Write-Host "Deploy OK" -ForegroundColor Green

# Verify
Write-Host "`n[3/3] Verifying..." -ForegroundColor Yellow
$url = "https://cashflow-tracker-kappa-lime-eight.vercel.app"
try {
    $r = Invoke-WebRequest -Uri "$url/data.json" -UseBasicParsing -TimeoutSec 10
    $data = $r.Content | ConvertFrom-Json
    $ob = $data | Where-Object { $_.description -eq "OPENING BALANCE" -and $_.month -eq "July" }
    if ($ob) {
        Write-Host "July opening balance: AED $($ob.amount)" -ForegroundColor Green
    }
    Write-Host "App is live: $url" -ForegroundColor Green
} catch {
    Write-Warning "Verify failed: $_"
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan