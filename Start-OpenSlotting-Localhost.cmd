@echo off
setlocal
set "SCRIPT=%~dp0Start-OpenSlotting-Localhost.py"

where py.exe >nul 2>nul
if not errorlevel 1 goto run_py

where python.exe >nul 2>nul
if not errorlevel 1 goto run_python

echo Python 3 was not found.
echo OpenSlotting itself requires no installation, but this experimental localhost start needs an existing Python 3 runtime.
pause
exit /b 1

:run_py
py -3 "%SCRIPT%" %*
goto finish

:run_python
python "%SCRIPT%" %*

:finish
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
