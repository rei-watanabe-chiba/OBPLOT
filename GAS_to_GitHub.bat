@echo off
setlocal enabledelayedexpansion

:: ----------------------------------------------------
:: [0] clasp login check
:: ----------------------------------------------------
set "DONE_FILE=%temp%\clasp_done.tmp"
set "LOG_FILE=%temp%\clasp_login.log"
if exist "%DONE_FILE%" del "%DONE_FILE%"
if exist "%LOG_FILE%" del "%LOG_FILE%"

for /f %%a in ('"prompt $H&for %%b in (1) do rem"') do set "BS=%%a"
<nul set /p ="Checking clasp login... "

start /b cmd /c "clasp login > "%LOG_FILE%" 2>&1 & type nul > "%DONE_FILE%""

set "sp=|\-/"
set /a i=0
:SPIN_LOOP
timeout /t 1 /nobreak >nul 2>&1
set /a "idx=i %% 4"
for %%j in (!idx!) do <nul set /p ="!BS!!sp:~%%j,1!"
set /a i+=1
if not exist "%DONE_FILE%" goto SPIN_LOOP

<nul set /p ="!BS! "
echo.
echo ==================================================
echo Login Check Completed.
echo ==================================================

:: ----------------------------------------------------
:: Main Menu
:: ----------------------------------------------------
:MENU
echo.
echo ==================================================
echo GAS - GitHub Sync Menu (dev/main)
echo ==================================================
echo [1] Push local dev to GAS and GitHub
echo [2] Pull GAS edits to local dev
echo [3] Push main to GAS (Rollback)
echo [4] Merge dev to main
echo [5] Run repomix (Textise)
echo [0] Exit
echo ==================================================
set /p choice="Enter a number (0-5): "

if "%choice%"=="1" goto PUSH_DEV
if "%choice%"=="2" goto PULL_GAS
if "%choice%"=="3" goto PUSH_MAIN
if "%choice%"=="4" goto MERGE_MAIN
if "%choice%"=="5" goto TEXTISE
if "%choice%"=="0" exit /b
goto MENU

:: ----------------------------------------------------
:: [1] Push local dev to GAS and GitHub
:: ----------------------------------------------------
:PUSH_DEV
echo.
echo === [1] Push local dev to GAS and GitHub ===
cd /d "%~dp0"
git checkout dev
call :CLEAN_GITIGNORE
git add -A
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "Auto-commit: update dev branch"
) else (
    echo [INFO] No local changes to commit.
)
git push origin dev
echo [INFO] Pushing to GAS...
call clasp push
goto END_PROMPT

:: ----------------------------------------------------
:: [2] Pull GAS edits to local dev
:: ----------------------------------------------------
:PULL_GAS
echo.
echo === [2] Pull GAS edits to local dev ===
cd /d "%~dp0"
git checkout dev
echo [INFO] Pulling from GAS...
call clasp pull
call :CLEAN_GITIGNORE
git add -A
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "Sync: Pull manual edits from GAS to dev"
) else (
    echo [INFO] No changes to pull.
)
git push origin dev
goto END_PROMPT

:: ----------------------------------------------------
:: [3] Push main to GAS
:: ----------------------------------------------------
:PUSH_MAIN
echo.
echo === [3] Push main to GAS ===
cd /d "%~dp0"
git checkout main
git push origin main
echo [INFO] Pushing stable main to GAS...
call clasp push
echo [INFO] Returning to dev branch...
git checkout dev
goto END_PROMPT

:: ----------------------------------------------------
:: [4] Merge dev to main
:: ----------------------------------------------------
:MERGE_MAIN
echo.
echo === [4] Merge dev to main ===
cd /d "%~dp0"
git checkout main
git merge dev
git push origin main
echo [INFO] Merge complete. Returning to dev branch...
git checkout dev
goto END_PROMPT

:: ----------------------------------------------------
:: [5] Run repomix
:: ----------------------------------------------------
:TEXTISE
echo.
echo === [5] Run repomix ===
echo [1] Default
echo [2] GAS Code
echo [3] Infra Code
echo [4] Docs Code
echo [5] Architecture Only
echo ==================================================
set /p pack_choice="Enter a number (1-5): "

set IGNORE_FILES=
if "%pack_choice%"=="1" set IGNORE_FILES="spec/**"
if "%pack_choice%"=="2" set IGNORE_FILES="spec/**, .github/**, infra/**, docs/**, image/**"
if "%pack_choice%"=="3" set IGNORE_FILES="spec/**, docs/**, src/**"
if "%pack_choice%"=="4" set IGNORE_FILES="spec/**, docs/**"
if "%pack_choice%"=="5" set IGNORE_FILES="spec/**, infra/**, src/**, .github/**, image/**, GAStemplate/**"

if not defined IGNORE_FILES (
    echo Invalid input. Exiting.
    goto END_PROMPT
)

cd /d "%~dp0"
echo [INFO] Running repomix...
call npx --yes repomix --remote "https://github.com/rei-watanabe-chiba/OBPLOT" --style markdown --no-file-summary --ignore %IGNORE_FILES%
echo [INFO] repomix-output.md generation complete.
goto END_PROMPT

:: ----------------------------------------------------
:: End Prompt
:: ----------------------------------------------------
:END_PROMPT
echo.
set "end_choice="
set /p end_choice="[1] Return to Menu / [Enter] Exit : "
if "%end_choice%"=="1" goto MENU
exit /b

:: ----------------------------------------------------
:: Subroutine: .gitignore Dynamic Cleanup
:: ----------------------------------------------------
:CLEAN_GITIGNORE
:: `findstr /x` exactly matches the line, preventing duplicate entries automatically.
if not exist .gitignore type nul > .gitignore
findstr /x /c:".clasp.json" .gitignore >nul 2>&1
if errorlevel 1 echo .clasp.json>>.gitignore
findstr /x /c:".gitignore" .gitignore >nul 2>&1
if errorlevel 1 echo .gitignore>>.gitignore
findstr /x /c:"repomix-output.md" .gitignore >nul 2>&1
if errorlevel 1 echo repomix-output.md>>.gitignore

:: Remove tracking for ignored files if they were accidentally added
git rm --cached .clasp.json >nul 2>&1
git rm --cached .gitignore >nul 2>&1
git rm --cached repomix-output.md >nul 2>&1
exit /b