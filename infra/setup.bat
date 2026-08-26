@echo off
setlocal

echo ==============================================
echo OBPLOT 1.0 Excel Add-in Setup
echo ==============================================

set "ADDIN_DIR=C:\OBPLOT_Addin"
if not exist "%ADDIN_DIR%" mkdir "%ADDIN_DIR%"

echo [1/3] Downloading manifest.xml...
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/rei-watanabe-chiba/OBPLOT/main/infra/manifest.xml' -OutFile '%ADDIN_DIR%\manifest.xml'"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to download manifest.xml. Please check your network.
    pause
    exit /b
)
if not exist "%ADDIN_DIR%\manifest.xml" (
    echo.
    echo [ERROR] manifest.xml not found in the target directory.
    pause
    exit /b
)

echo [2/3] Configuring shared folder...
net share OBPLOT_Addin /delete >nul 2>&1
net share OBPLOT_Addin="%ADDIN_DIR%" /grant:Everyone,READ >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to set up shared folder. Try running as Administrator.
    pause
    exit /b
)

echo [3/3] Configuring Registry...
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Id" /t REG_SZ /d "{-12345678-1234-1234-1234-123456789012-}" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Url" /t REG_SZ /d "\\localhost\OBPLOT_Addin" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Flags" /t REG_DWORD /d 1 /f >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to update registry.
    pause
    exit /b
)

echo.
echo ==================================================
echo [SUCCESS] Setup completed!
echo Please open Excel, go to Insert -^> My Add-ins -^> Shared Folder,
echo and add "OBPLOT 1.0".
echo Press any key to exit...
echo ==================================================
pause >nul
exit /b
