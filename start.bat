@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   Skin AI - starting...
echo   URL: http://127.0.0.1:3000
echo   Keep this window open. Ctrl+C to stop.
echo.

REM Next.js deletes .next on startup; clearing it here first avoids that crash.
if exist ".next" rmdir /s /q ".next"
for /d %%D in (".next.prev-*") do rmdir /s /q "%%D"
for /d %%D in (".next.old-*") do rmdir /s /q "%%D"
for /d %%D in (".next.build-*") do rmdir /s /q "%%D"

set "URL=http://127.0.0.1:3000"
set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CHROME2=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

REM Launch with proxy bypass so the system proxy cannot swallow localhost.
if exist "%EDGE%" (
  start "" "%EDGE%" --proxy-bypass-list="127.0.0.1;localhost" "%URL%"
) else if exist "%CHROME%" (
  start "" "%CHROME%" --proxy-bypass-list="127.0.0.1;localhost" "%URL%"
) else if exist "%CHROME2%" (
  start "" "%CHROME2%" --proxy-bypass-list="127.0.0.1;localhost" "%URL%"
) else (
  start "" "%URL%"
)

npm run dev -- --hostname 127.0.0.1

pause
