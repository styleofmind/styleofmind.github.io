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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=New-Object Net.Sockets.TcpClient; try {$c.Connect('127.0.0.1',8000); $c.Close(); exit 0} catch {exit 1}"
if errorlevel 1 (
  pushd "%ROOT%"
  start "Style of Mind Preview" cmd /k ""%PY%" "%TOOL%" preview --port 8000"
  popd
  timeout /t 3 /nobreak >nul
)
start "" "http://127.0.0.1:8000/"
endlocal
