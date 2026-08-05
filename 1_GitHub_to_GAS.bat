@echo off
chcp 65001 >nul
echo =========================================
echo [1] GitHubのデータをGASにアップロードします
echo =========================================

cd /d "C:\clasp"

echo.
echo GitHubから最新のコードを取得中...
git pull origin main

echo.
echo GASへコードを反映中...
clasp push

echo.
echo 処理が完了しました。
pause