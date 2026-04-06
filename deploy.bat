@echo off
echo ================================================
echo   Cashflow Tracker - Vercel Deploy Script
echo ================================================
echo.

cd /d "%~dp0"

echo Step 1: Checking if logged in to Vercel...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo Not logged in! Opening browser...
    start https://vercel.com/login
    echo.
    echo PLEASE:
    echo 1. Login or Sign up at vercel.com
    echo 2. Come back to this window
    echo 3. Press any key to continue
    pause >nul
)

echo.
echo Step 2: Building the app...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Deploying to Vercel...
vercel --prod --yes

echo.
echo ================================================
echo   Deployment Complete!
echo ================================================
echo.
echo Your app is now live!
echo.
pause
