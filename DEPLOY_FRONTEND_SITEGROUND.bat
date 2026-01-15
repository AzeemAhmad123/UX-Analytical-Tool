@echo off
echo ========================================
echo Frontend Deployment for SiteGround
echo ========================================
echo.

cd frontend

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Building frontend...
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
echo 1. Go to SiteGround File Manager
echo 2. Navigate to: enalyze.123fixit.com/public_html
echo 3. Upload ALL files from: frontend/dist/
echo 4. Create .htaccess file (see SITEGROUND_DEPLOYMENT_GUIDE.txt)
echo.
pause
