@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-OpenSlotting.ps1"
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
