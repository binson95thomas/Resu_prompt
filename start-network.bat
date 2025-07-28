@echo off
echo ========================================
echo    ResuPrompt Network Access Setup
echo ========================================
echo.

echo Finding your IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%
echo Your IP Address: %IP%
echo.

echo Starting all services in separate terminal tabs...
echo.
echo Frontend will be available at: http://%IP%:5173
echo Backend will be available at: http://%IP%:3001
echo Document Service will be available at: http://%IP%:8080
echo.
echo Each service will run in its own terminal tab
echo.

REM Check if Windows Terminal is available
where wt >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Windows Terminal with tabs in single window...
    
    REM Set absolute paths to each service directory
    set FRONTEND_DIR=%~dp0frontend
    set BACKEND_DIR=%~dp0backend
    set DOCSERVICE_DIR=%~dp0doc-service
    
    REM Start all servers in separate tabs with custom titles and colors
    wt ^
      new-tab -d "%DOCSERVICE_DIR%" --title "Document Service" --tabColor "#0078D4" cmd /k "gradlew bootRun" ^
      ; new-tab -d "%BACKEND_DIR%" --title "Backend" --tabColor "#107C10" cmd /k "npm start" ^
      ; new-tab -d "%FRONTEND_DIR%" --title "Frontend" --tabColor "#D83B01" cmd /k "npm run dev"
    
) else (
    echo Windows Terminal not found, using regular command prompts...
    
    REM Start document service in new window
    start "ResuPrompt Document Service" cmd /k "cd doc-service && gradlew bootRun"
    
    REM Wait for document service to start
    timeout /t 5 /nobreak >nul
    
    REM Start backend in new window
    start "ResuPrompt Backend" cmd /k "cd backend && npm start"
    
    REM Wait a moment for backend to start
    timeout /t 3 /nobreak >nul
    
    REM Start frontend in new window
    start "ResuPrompt Frontend" cmd /k "cd frontend && npm run dev"
)

echo.
echo All services started! Check the terminal tabs/windows.
echo.
echo Health check URLs:
echo - Document Service: http://%IP%:8080/health
echo - Backend: http://%IP%:3001/api/health
echo - Frontend: http://%IP%:5173
echo.
pause 