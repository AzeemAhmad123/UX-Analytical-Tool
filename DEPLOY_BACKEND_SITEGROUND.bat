@echo off
echo ========================================
echo Backend Deployment for SiteGround
echo ========================================
echo.

cd backend

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Building backend...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create subdomain: api.enalyze.123fixit.com
echo 2. Go to SiteGround - Site - Node.js
echo 3. Create Node.js App for api.enalyze.123fixit.com
echo 4. Upload files from: backend/dist/ and package.json
echo 5. Create .env file on server
echo 6. Set Start Command: node dist/index.js
echo 7. Start the app
echo.
echo See SITEGROUND_DEPLOYMENT_GUIDE.txt for details
echo.
pause
