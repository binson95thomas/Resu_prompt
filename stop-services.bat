@echo off
echo ========================================
echo    Stopping ResuPrompt Services
echo ========================================
echo.

REM Check if PID file exists
set PID_FILE=%TEMP%\resuprompt_pids.txt
if exist "%PID_FILE%" (
    echo Found PID file. Stopping specific processes...
    for /f %%i in (%PID_FILE%) do (
        echo Stopping process PID: %%i
        taskkill /PID %%i /F >nul 2>&1
    )
    del "%PID_FILE%"
    echo PID file deleted.
) else (
    echo No PID file found. Stopping all Node.js and Java processes...
)

REM Kill any remaining Node.js and Java processes related to our services
echo.
echo Stopping any remaining Node.js processes...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Node.js processes stopped
) else (
    echo [✗] No Node.js processes found
)

echo Stopping any remaining Java processes...
taskkill /f /im java.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Java processes stopped
) else (
    echo [✗] No Java processes found
)

echo.
echo ========================================
echo    Cleanup
echo ========================================
echo.

REM Clean up log files
echo Cleaning up log files...
if exist "%TEMP%\doc-service.log" del "%TEMP%\doc-service.log"
if exist "%TEMP%\backend.log" del "%TEMP%\backend.log"
if exist "%TEMP%\frontend.log" del "%TEMP%\frontend.log"

echo.
echo All services stopped and cleaned up!
echo.
pause 