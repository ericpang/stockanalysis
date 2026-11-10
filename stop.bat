@echo off
setlocal EnableDelayedExpansion
title DayTrade Stopper
cd /d "%~dp0"

echo ========================================================
echo   Stopping DayTrade Stock Analysis Web App...
echo ========================================================

set "FOUND_PROC=0"

:: 1. Stop any process listening on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo [INFO] Terminating process on port 3000 ^(PID: %%a^)...
        taskkill /F /T /PID %%a >nul 2>&1
        set "FOUND_PROC=1"
    )
)

:: 2. Also close the dedicated cmd window if open
taskkill /F /FI "WINDOWTITLE eq DayTrade Stock Analysis Server*" /T >nul 2>&1

if "!FOUND_PROC!"=="1" (
    echo [OK] DayTrade server on port 3000 has been stopped.
) else (
    echo [INFO] No running DayTrade server found on port 3000.
)

timeout /t 2 >nul
endlocal

