@echo off
setlocal

REM --- Configuration ---
REM Set the directory containing the JSON quiz files (relative to this script)
set "DATA_DIR=data"
REM Set the name of the output manifest file (will be placed inside DATA_DIR)
set "MANIFEST_FILE=quiz-manifest.json"

REM Check if the data directory exists
if not exist "%DATA_DIR%" (
    echo ERROR: Data directory "%DATA_DIR%" not found.
    echo Please create it and place your JSON quiz files inside.
    pause
    goto :eof
)

echo Creating quiz manifest: %MANIFEST_FILE%

REM --- Core Logic ---
REM Use parentheses and redirection to capture all echo output into the file at once.
(
    REM Start the JSON array
    echo [

    REM Use a flag to handle commas correctly (no comma before the first item)
    set "first_item=1"

    REM Loop through all .json files in the specified data directory
    REM %%~nxF extracts just the filename and extension from the full path %%F
    for %%F in ("%DATA_DIR%\*.json") do (
        if defined first_item (
            REM First item: echo filename without preceding comma, then clear the flag
            echo   "%%~nxF"
            set "first_item="
        ) else (
            REM Subsequent items: echo comma, then filename
            echo ,  "%%~nxF"
        )
    )

    REM End the JSON array
    echo ]
) > "%MANIFEST_FILE%"

echo Manifest created successfully!
echo Contains list of JSON files found in "%DATA_DIR%".