@echo off
setlocal enabledelayedexpansion

title VocabBloom Build ^& Deploy Pipeline
color 0B

echo ===================================================
echo   VocabBloom Build ^& Deploy Manager (Port 4173)
echo ===================================================
echo.

:: 1. Detect and terminate any existing process on port 4173 (dev or preview)
echo [1/4] Checking for running server on port 4173...
set "PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":4173 *LISTENING"') do (
    set "PID=%%a"
)

if defined PID (
    echo @@ Found active process on port 4173 with PID: !PID!
    echo @@ Stopping active server...
    taskkill /F /PID !PID! >nul 2>&1
    if !errorlevel! equ 0 (
        echo @@ Successfully stopped the active server!
    ) else (
        echo [WARNING] Failed to terminate process. If it persists, try running this script as Administrator.
    )
) else (
    echo @@ Port 4173 is clear. No active processes found.
)
echo.

:: 2. Run TypeScript compilation and Vite build
echo [2/4] Compiling and building VocabBloom codebase...
echo @@ Running npm run build...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ===================================================
    echo   [ERROR] Compilation failed!
    echo   Please fix the TypeScript/bundler errors above.
    echo ===================================================
    echo.
    pause
    exit /b %errorlevel%
)
echo @@ Production bundle compiled successfully!
echo.

:: 3. Deploy step: Copy static assets from public to dist (since publicDir is disabled)
echo [3/4] Deploying static assets to production dist directory...
if not exist "dist" (
    mkdir "dist"
)
copy /Y "public\favicon.svg" "dist\favicon.svg" >nul
copy /Y "public\sw.js" "dist\sw.js" >nul
echo @@ Static assets deployed successfully (favicon, service worker).
echo.

:: 4. Start production preview server
echo [4/4] Launching Production Preview server...
echo @@ Local:   http://localhost:4173/
echo @@ Network: http://192.168.210.50:4173/
echo @@ Press Ctrl+C in this window to stop the server.
echo ===================================================
echo.

npm run preview

pause
