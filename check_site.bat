@echo off
setlocal
set "ROOT=%~dp0"
set "PY=%ROOT%.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Python virtual environment is missing. Read LOCAL_PREVIEW.md.
  pause
  exit /b 1
)
"%PY%" "%ROOT%tools\site_tools.py" audit
echo.
echo Report and screenshots: "%ROOT%..\site-audit"
pause
endlocal
