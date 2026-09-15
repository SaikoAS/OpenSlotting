@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-OpenSlotting-Localhost.ps1"
set "OpenSlottingExitCode=%ERRORLEVEL%"
echo.
pause
exit /b %OpenSlottingExitCode%
