@echo off
chcp 65001 >nul
cd /d "%~dp0"

title My Postman - Tauri Build

echo ========================================
echo   My Postman - Rebuild Desktop App
echo ========================================
echo.

echo [1/3] Stopping running app.exe...
taskkill /IM app.exe /F >nul 2>&1

set "VCVARS=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" (
  echo [ERROR] Visual Studio Build Tools not found.
  echo         Install VS 2022 Build Tools with C++ workload.
  echo.
  pause
  exit /b 1
)

echo [2/3] Initializing MSVC environment...
call "%VCVARS%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to initialize MSVC environment.
  echo.
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm not found. Install Node.js and pnpm first.
  echo.
  pause
  exit /b 1
)

echo [3/3] Building...
echo.
pnpm tauri build --no-bundle
set BUILD_EXIT=%ERRORLEVEL%

echo.
if %BUILD_EXIT% equ 0 (
  echo ========================================
  echo   Build succeeded!
  echo   Output: src-tauri\target\release\app.exe
  echo ========================================
) else (
  echo ========================================
  echo   Build failed. Exit code: %BUILD_EXIT%
  echo ========================================
)

echo.
pause
exit /b %BUILD_EXIT%
