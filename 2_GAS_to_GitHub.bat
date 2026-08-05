@echo off
echo =========================================
echo BuckUp GAS to GitHub...
echo =========================================

cd /d "C:\clasp"

echo.
echo pull from GAS...
call clasp pull

echo.
echo push to GitHub...
git add .
git commit -m "Auto-commit: backup from GAS"
git push origin main

echo.
echo BuckUp : succes
pause