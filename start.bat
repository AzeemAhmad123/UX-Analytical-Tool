@echo off
echo Starting Frontend and Backend...
echo.

REM Change to backend directory and start backend in a new window
cd /d "%~dp0backend"
start "Backend Server" cmd /k "npm run dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Change to frontend directory and start frontend in a new window
cd /d "%~dp0frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit this window (servers will continue running)...
pause >nul
