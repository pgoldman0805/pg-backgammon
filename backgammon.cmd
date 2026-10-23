@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install || goto :fail
)

if "%~1"=="--rebuild" (
  echo Rebuilding...
  call npm run build || goto :fail
) else if not exist dist\index.html (
  echo Building...
  call npm run build || goto :fail
)

echo.
echo pg-backgammon: http://localhost:4330  (close this window to stop)
echo Launch with --rebuild after pulling new code.
echo.
call npm run start
goto :eof

:fail
echo.
echo Launch failed - see output above.
pause
exit /b 1
