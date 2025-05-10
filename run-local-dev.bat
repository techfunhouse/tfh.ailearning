@echo off
echo Starting local development server...

:: Set environment variables
set NODE_ENV=development

:: Run the server
npx tsx server/local-entry.ts

pause