@echo off
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js first: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules call npm.cmd install
start "" "http://localhost:5173"
call npm.cmd run dev
pause
