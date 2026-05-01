@echo off
echo Starting Wash Zambia Laundry System Server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH!
    echo Please install Python 3.6+ and try again.
    pause
    exit /b 1
)

REM Start the server
python server.py

pause
