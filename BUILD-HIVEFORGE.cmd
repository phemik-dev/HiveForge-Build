@echo off
setlocal

REM Build HiveForge-branded artifacts from this checkout.
REM Runs the PowerShell script with ExecutionPolicy bypass for convenience.

set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%BUILD-HIVEFORGE.ps1"

endlocal
