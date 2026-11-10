@echo off
setlocal EnableDelayedExpansion
title DayTrade Launcher
cd /d "%~dp0"

echo ========================================================
echo   DayTrade - Multi-Market Stock Analysis Web App
echo ========================================================

:: 1. Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [INFO] Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 2. Check if port 3000 is already listening
set "PORT_IN_USE="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    set "PORT_IN_USE=%%a"
)

if defined PORT_IN_USE (
    echo [INFO] DayTrade server is already running on port 3000 ^(PID: !PORT_IN_USE!^).
    echo [INFO] Opening http://localhost:3000 in your browser...
    start "" "http://localhost:3000"
    exit /b 0
)

:: 3. Start the Next.js development server in a dedicated window and open browser
echo [INFO] Starting DayTrade server on http://localhost:3000 ...
start "DayTrade Stock Analysis Server" cmd /k "cd /d "%~dp0" && npm run dev"

:: Wait briefly for the server to initialize before launching browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

echo [OK] DayTrade started. Run stop.bat to stop the server.
endlocal

