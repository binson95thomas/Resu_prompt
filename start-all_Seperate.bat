@echo off
REM This script starts frontend, backend, and doc-service in separate tabs using Windows Terminal

echo ========================================
echo    ResuPrompt Services Startup
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

echo Starting all services with network access...
echo.
echo Frontend will be available at: http://%IP%:5173
echo Backend will be available at: http://%IP%:3001
echo Document Service will be available at: http://%IP%:8080
echo.

REM Set absolute paths to each service directory
set FRONTEND_DIR=%~dp0frontend
set BACKEND_DIR=%~dp0backend
set DOCSERVICE_DIR=%~dp0doc-service

REM Start all servers in separate tabs with custom titles and colors
wt ^
  new-tab -d "%DOCSERVICE_DIR%" --title "Document Service" --tabColor "#0078D4" cmd /k "gradle bootRun" ^
  ; new-tab -d "%BACKEND_DIR%" --title "Backend" --tabColor "#107C10" cmd /k "npm start" ^
  ; new-tab -d "%FRONTEND_DIR%" --title "Frontend" --tabColor "#D83B01" cmd /k "npm run dev" ^
  ; new-tab -d "%~dp0" --title "Base Script" --tabColor "#6B46C1" cmd /k "echo Base Script - All services started successfully! && echo. && echo Health Check URLs: && echo - Document Service: http://%IP%:8080/health && echo - Backend: http://%IP%:3001/api/health && echo - Frontend: http://%IP%:5173 && echo. && echo Press any key to exit... && pause"

echo.
echo All services started! Check the terminal tabs.
echo.
echo Health check URLs:
echo - Document Service: http://%IP%:8080/health
echo - Backend: http://%IP%:3001/api/health
echo - Frontend: http://%IP%:5173
echo.
pause 