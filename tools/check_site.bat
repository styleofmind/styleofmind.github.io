@echo off
setlocal
for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "PY=%ROOT%\.venv\Scripts\python.exe"
set "TOOL=%ROOT%\tools\site_tools.py"
if not exist "%PY%" (
  echo Python virtual environment is missing. Read "%ROOT%\AI_DOCS\guides\LOCAL_PREVIEW.md".
  pause
  exit /b 1
)
"%PY%" "%TOOL%" audit
echo.
echo Report and screenshots: "%ROOT%\site-audit"
pause
endlocal
