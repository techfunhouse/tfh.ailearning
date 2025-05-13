@echo off
REM RefHub Setup Script for Windows
echo === RefHub Initial Setup Script ===
echo This script will install all dependencies for client and server.

REM Install root dependencies
echo.
echo Installing root dependencies...
call npm install

REM Install client dependencies
echo.
echo Installing client dependencies...
cd client
call npm install
cd ..

REM Install server dependencies
echo.
echo Installing server dependencies...
cd server
call npm install
cd ..

REM Create data directory if it doesn't exist
echo.
echo Setting up data directory...
if not exist "data" mkdir data
if not exist "server\data" mkdir server\data

REM Copy env files
echo.
echo Setting up environment files...
if not exist ".env" (
  if exist ".env.example" (
    copy .env.example .env
  ) else (
    echo No .env.example found, skipping...
  )
)

REM Optional: install global dependencies
echo.
set /p install_globals=Would you like to install global dependencies (concurrently)? [y/N] 
if /i "%install_globals%"=="y" (
  echo Installing global dependencies...
  call npm install -g concurrently
)

REM Success message
echo.
echo Setup complete!
echo To start the application:
echo   * Start client: cd client ^&^& npm run dev
echo   * Start server: cd server ^&^& npm run dev
echo.
echo For more options, see README.md and TROUBLESHOOTING.md
echo.
pause