@echo off
setlocal

REM ============================================================================
REM This script runs the build and server commands using NPM from within WSL.
REM It assumes your WSL distribution is named 'ubuntu'.
REM Place this file in the root of your project.
REM ============================================================================

set "WSL_DISTRO=ubuntu"

REM Check if WSL is installed and the distro is available.
wsl -d %WSL_DISTRO% -- "exit" >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not connect to the '%WSL_DISTRO%' WSL distribution.
    echo Please make sure WSL is installed and your distro is running.
    pause
    exit /b 1
)

echo.
echo ====================================
echo      Preparing WSL Environment
echo ====================================
echo.

REM Get the full path of the directory where this .bat file is located.
set "PROJECT_ROOT_WIN=%~dp0"
REM Remove trailing backslash if it exists.
if "%PROJECT_ROOT_WIN:~-1%"=="\" set "PROJECT_ROOT_WIN=%PROJECT_ROOT_WIN:~0,-1%"

REM Convert the Windows path to a WSL path (e.g., C:\Users -> /mnt/c/Users).
for /f "delims=" %%i in ('wsl -d %WSL_DISTRO% wslpath -a "%PROJECT_ROOT_WIN%"') do set "PROJECT_ROOT_WSL=%%i"
echo WSL Project Root: %PROJECT_ROOT_WSL%
echo.


echo ====================================
echo  Step 1: Building Manifest in WSL
echo ====================================
echo.

REM Define the build command: cd into the build dir, install, and then build.
set "BUILD_COMMANDS=cd '%PROJECT_ROOT_WSL%/build-manifest' && echo '[WSL] Installing/verifying dependencies...' && npm install && echo '[WSL] Building quiz manifest...' && npm run build"

REM Execute the build commands in WSL's bash shell.
wsl -d %WSL_DISTRO% -- bash -c "%BUILD_COMMANDS%"

REM Check if the build command was successful.
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The build step failed. Please review the output above.
    pause
    exit /b 1
)

echo.
echo Build step completed successfully.
echo.
echo ====================================
echo  Step 2: Starting Server for Root
echo ====================================
echo.
echo Server will be available at http://127.0.0.1:8080
echo Press Ctrl+C in this window to stop the server.
echo.

REM Define the serve command:
REM This directly calls the http-server executable installed in the build directory's node_modules,
REM and explicitly tells it to serve the project root directory.
set "SERVE_COMMANDS='%PROJECT_ROOT_WSL%/build-manifest/node_modules/.bin/http-server' '%PROJECT_ROOT_WSL%' -c-1"

REM Execute the serve command.
wsl -d %WSL_DISTRO% -- bash -c "%SERVE_COMMANDS%"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The server failed to start. Please review the output.
) else (
    echo.
    echo Server stopped.
)

echo.
pause