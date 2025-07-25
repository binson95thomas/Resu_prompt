@echo off
REM This script starts frontend, backend, and doc-service in separate tabs using Windows Terminal

REM Set absolute paths to each service directory
set FRONTEND_DIR=%~dp0frontend
set BACKEND_DIR=%~dp0backend
set DOCSERVICE_DIR=%~dp0doc-service

REM Start all servers in separate tabs with custom titles
wt ^
  new-tab -d "%FRONTEND_DIR%" --title "Frontend" cmd /k "npm install && npm run dev" ^
  ; new-tab -d "%BACKEND_DIR%" --title "Backend" cmd /k "npm install && npm run dev" ^
  ; new-tab -d "%DOCSERVICE_DIR%" --title "Doc Service" cmd /k "gradle bootRun" 