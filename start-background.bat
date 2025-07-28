@echo off
REM Windows version: Starts all services as background processes in the same terminal tab
setlocal enabledelayedexpansion

echo ========================================
echo    ResuPrompt Background Services
echo ========================================
echo.

echo Finding your IP addresses...
set "ALLIPS=localhost 127.0.0.1"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP: =!
    set ALLIPS=!ALLIPS! !IP!
)
echo Detected IP addresses: !ALLIPS!
echo.

echo Starting all services as background processes...
echo.

REM Set absolute paths to each service directory
set FRONTEND_DIR=%~dp0frontend
set BACKEND_DIR=%~dp0backend
set DOCSERVICE_DIR=%~dp0doc-service

REM Create a temporary file to store PIDs
set PID_FILE=%TEMP%\resuprompt_pids.txt
echo. > "%PID_FILE%"

echo [1/4] Starting Document Service...
cd /d "%DOCSERVICE_DIR%"
start /b cmd /c "gradle bootRun > %TEMP%\doc-service.log 2>&1"
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq java.exe" /fo csv ^| findstr "java.exe"') do (
    set DOC_PID=%%a
    echo !DOC_PID! >> "%PID_FILE%"
    echo Document Service PID: !DOC_PID!
)

echo [2/4] Starting Backend...
cd /d "%BACKEND_DIR%"
start /b cmd /c "npm start > %TEMP%\backend.log 2>&1"
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "node.exe"') do (
    set BACKEND_PID=%%a
    echo !BACKEND_PID! >> "%PID_FILE%"
    echo Backend PID: !BACKEND_PID!
)

echo [3/4] Starting Frontend...
cd /d "%FRONTEND_DIR%"
start /b cmd /c "npm run dev > %TEMP%\frontend.log 2>&1"
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "node.exe"') do (
    set FRONTEND_PID=%%a
    echo !FRONTEND_PID! >> "%PID_FILE%"
    echo Frontend PID: !FRONTEND_PID!
)

echo [4/4] All services started!
echo.

echo ========================================
echo    Service URLs
echo ========================================
echo.
echo [Document Service]
for %%I in (!ALLIPS!) do echo   http://%%I:8080/health
echo.
echo [Backend]
for %%I in (!ALLIPS!) do echo   http://%%I:3001/api/health
echo.
echo [Frontend]
for %%I in (!ALLIPS!) do echo   http://%%I:5173
echo.

echo Log files:
echo - Document Service: %TEMP%\doc-service.log
echo - Backend: %TEMP%\backend.log
echo - Frontend: %TEMP%\frontend.log
echo.
echo PIDs saved to: %PID_FILE%
echo.

:menu
echo ========================================
echo    Control Menu
echo ========================================
echo 1. View all logs (real-time)
echo 2. View specific service log
echo 3. Stop all services
echo 4. Check service status
echo 5. Exit (keep services running)
echo.
REM Flush input buffer to fix first input issue
:flushinput
set INPUT=
set /p INPUT="" 2>nul
if not errorlevel 1 goto flushinputdone
goto flushinput
:flushinputdone
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto view_all_logs
if "%choice%"=="2" goto view_specific_log
if "%choice%"=="3" goto stop_all_services
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto exit_keep_running
echo Invalid choice. Please try again.
goto menu

:view_all_logs
echo.
echo ========================================
echo    Real-time Logs (Press Ctrl+C to stop)
echo ========================================
echo.
powershell -Command "Get-Content '%TEMP%\doc-service.log', '%TEMP%\backend.log', '%TEMP%\frontend.log' -Wait -Tail 10"
goto menu

:view_specific_log
echo.
echo Which service log do you want to view?
echo 1. Document Service
echo 2. Backend
echo 3. Frontend
echo 4. Back to main menu
echo.
set /p log_choice="Enter choice (1-4): "

if "%log_choice%"=="1" (
    echo.
    echo ========================================
    echo    Document Service Log
    echo ========================================
    type "%TEMP%\doc-service.log"
    echo.
    echo Press any key to return to the menu...
    pause
) else if "%log_choice%"=="2" (
    echo.
    echo ========================================
    echo    Backend Log
    echo ========================================
    type "%TEMP%\backend.log"
    echo.
    echo Press any key to return to the menu...
    pause
) else if "%log_choice%"=="3" (
    echo.
    echo ========================================
    echo    Frontend Log
    echo ========================================
    type "%TEMP%\frontend.log"
    echo.
    echo Press any key to return to the menu...
    pause
) else if "%log_choice%"=="4" (
    goto menu
) else (
    echo Invalid choice.
    echo.
    echo Press any key to return to the menu...
    pause
)
goto menu

:stop_all_services
echo.
echo ========================================
echo    Stopping All Services
echo ========================================
echo.

REM Read PIDs from file and kill processes
if exist "%PID_FILE%" (
    for /f %%i in (%PID_FILE%) do (
        echo Stopping process PID: %%i
        taskkill /PID %%i /F >nul 2>&1
    )
    del "%PID_FILE%"
)

REM Kill any remaining Node.js and Java processes related to our services
echo Stopping any remaining Node.js processes...
taskkill /f /im node.exe >nul 2>&1
echo Stopping any remaining Java processes...
taskkill /f /im java.exe >nul 2>&1

echo.
echo All services stopped!
echo.
pause
exit /b 0

:check_status
echo.
echo ========================================
echo    Service Status Check
echo ========================================
echo.

echo [Document Service]
for %%I in (!ALLIPS!) do echo   http://%%I:8080/health
echo.
echo [Backend]
for %%I in (!ALLIPS!) do echo   http://%%I:3001/api/health
echo.
echo [Frontend]
for %%I in (!ALLIPS!) do echo   http://%%I:5173
echo.
echo Press any key to return to the menu...
pause
goto menu

:exit_keep_running
echo.
echo ========================================
echo    Services will continue running
echo ========================================
echo.
echo [Document Service]
for %%I in (!ALLIPS!) do echo   http://%%I:8080/health
echo.
echo [Backend]
for %%I in (!ALLIPS!) do echo   http://%%I:3001/api/health
echo.
echo [Frontend]
for %%I in (!ALLIPS!) do echo   http://%%I:5173
echo.
pause
exit /b 0 