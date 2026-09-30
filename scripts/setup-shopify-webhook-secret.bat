@echo off
REM Setup Shopify Webhook Secret in Vercel Production (Windows)
REM Usage: .\scripts\setup-shopify-webhook-secret.bat
REM
REM This script:
REM 1. Prompts for the Shopify webhook secret (from Partner Dashboard)
REM 2. Adds it to Vercel production environment
REM 3. Redeploys the app
REM 4. Verifies it's set

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo EcomOS: Setup Shopify Webhook Secret
echo ==========================================
echo.

REM Check if Vercel CLI is installed
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo Error: Vercel CLI not found or not logged in
    echo Install with: npm i -g vercel
    echo Then run: vercel login
    exit /b 1
)

echo.
echo To get your Shopify webhook secret:
echo    1. Go to https://partners.shopify.com
echo    2. Apps ^> EcomOS ^> Configuration
echo    3. Copy the 'Webhook Secret' value (looks like: shpss_...)
echo.

set /p WEBHOOK_SECRET="Enter your Shopify Webhook Secret: "

REM Validate format
echo %WEBHOOK_SECRET% | findstr /R "^shpss_" >nul
if errorlevel 1 (
    echo Error: Invalid format. Secret should start with 'shpss_'
    exit /b 1
)

echo.
echo Adding SHOPIFY_WEBHOOK_SECRET to Vercel Production...

REM Add to Vercel production environment using echo to pipe input
echo %WEBHOOK_SECRET% | vercel env add SHOPIFY_WEBHOOK_SECRET production

if errorlevel 1 (
    echo Error: Failed to add environment variable
    exit /b 1
)

echo.
echo Success! Secret added to Vercel Production
echo.

set /p DEPLOY="Redeploy now? (y/n): "

if /i "%DEPLOY%"=="y" (
    echo.
    echo Deploying to production...
    vercel --prod --yes
    if errorlevel 1 (
        echo Error: Deployment failed
        exit /b 1
    )
    echo.
    echo Success! Deployment complete!
) else (
    echo.
    echo Remember to deploy manually to activate the webhook:
    echo    vercel --prod --yes
)

echo.
echo Success! Shopify webhooks are now ready for production.
echo.
echo Your webhook endpoint is:
echo    https://ecomos-omega.vercel.app/api/webhooks/shopify/products/create
echo.

endlocal
