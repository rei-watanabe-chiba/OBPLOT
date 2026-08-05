@echo off
echo =========================================
echo [2] GASのデータをGitHubへバックアップします
echo =========================================

cd /d "C:\clasp"

echo.
echo GASから最新のコードを取得中...
call clasp pull

echo.
echo GitHubへ変更をコミットおよびプッシュ中...
git add .
git commit -m "Auto-commit: backup from GAS"
git push origin main

echo.
echo 処理が完了しました。
pause