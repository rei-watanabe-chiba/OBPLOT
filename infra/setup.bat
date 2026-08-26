@echo off
setlocal

echo ==============================================
echo OBPLOT 1.0 Excel Add-in Setup
echo ==============================================

set "ADDIN_DIR=C:\OBPLOT_Addin"
if not exist "%ADDIN_DIR%" mkdir "%ADDIN_DIR%"

echo [1/3] ダウンロード中 (manifest.xml)...
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/rei-watanabe-chiba/OBPLOT/main/infra/manifest.xml' -OutFile '%ADDIN_DIR%\manifest.xml'"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] manifest.xmlのダウンロードに失敗しました。ネットワーク接続を確認してください。
    pause
    exit /b
)
if not exist "%ADDIN_DIR%\manifest.xml" (
    echo.
    echo [ERROR] manifest.xmlが保存先に見つかりません。
    pause
    exit /b
)

echo [2/3] 共有フォルダの設定...
net share OBPLOT_Addin /delete >nul 2>&1
net share OBPLOT_Addin="%ADDIN_DIR%" /grant:Everyone,READ >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 共有フォルダの設定に失敗しました。このバッチを「管理者として実行」する必要があるかもしれません。
    pause
    exit /b
)

echo [3/3] レジストリの設定...
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Id" /t REG_SZ /d "{-12345678-1234-1234-1234-123456789012-}" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Url" /t REG_SZ /d "\\localhost\OBPLOT_Addin" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Flags" /t REG_DWORD /d 1 /f >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] レジストリへの書き込みに失敗しました。
    pause
    exit /b
)

echo.
echo ==================================================
echo [SUCCESS] セットアップが完了しました！
echo Excelを起動し、「挿入」タブ ＞ 「個人用アドイン」＞ 「共有フォルダー」 から「OBPLOT 1.0」を追加してください。
echo 何かのキーを押して終了してください...
echo ==================================================
pause >nul
exit /b
