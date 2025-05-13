@echo off
REM RefHub Development Startup Script for Windows
echo === Starting RefHub Development Environment ===
echo This script will start both the client and server in separate terminals.
echo.

REM Check if concurrently is installed
WHERE concurrently >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
  echo Concurrently not found. Installing...
  call npm install -g concurrently
)

REM Start both client and server
echo Starting client and server...
concurrently "cd client && npm run dev" "cd server && npm run dev"