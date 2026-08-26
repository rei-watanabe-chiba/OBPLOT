@echo off
setlocal

echo ==============================================
echo OBPLOT 1.0 Excel Add-in Setup
echo ==============================================

set "ADDIN_DIR=C:\OBPLOT_Addin"
if not exist "%ADDIN_DIR%" mkdir "%ADDIN_DIR%"

echo ダウンロード中 (manifest.xml)...
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/rei-watanabe-chiba/OBPLOT/main/manifest.xml' -OutFile '%ADDIN_DIR%\manifest.xml'"

echo 共有フォルダとレジストリの設定...
net share OBPLOT_Addin="%ADDIN_DIR%" /grant:Everyone,READ >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Id" /t REG_SZ /d "{-12345678-1234-1234-1234-123456789012-}" /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Url" /t REG_SZ /d "\\localhost\OBPLOT_Addin" /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{-12345678-1234-1234-1234-123456789012-}" /v "Flags" /t REG_DWORD /d 1 /f

echo ==============================================
echo セットアップ完了！
echo Excelを起動し、「挿入」タブ ＞ 「個人用アドイン」＞ 「共有フォルダー」 から「OBPLOT 1.0」を追加してください。
pause
