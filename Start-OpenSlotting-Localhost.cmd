@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-OpenSlotting-Localhost.ps1"
set "OpenSlottingExitCode=%ERRORLEVEL%"
if not "%OpenSlottingExitCode%"=="0" pause
exit /b %OpenSlottingExitCode%
