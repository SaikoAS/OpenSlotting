@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-OpenSlotting-Localhost.ps1"
set "OpenSlottingExitCode=%ERRORLEVEL%"
echo.
pause
exit /b %OpenSlottingExitCode%
