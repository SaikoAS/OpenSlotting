@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Remove-OpenSlotting.ps1"
set "OpenSlottingExitCode=%ERRORLEVEL%"
echo.
pause
exit /b %OpenSlottingExitCode%
