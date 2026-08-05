@echo off
echo =========================================
echo Upload GAS to GitHub
echo =========================================

cd /d "C:\clasp"

echo.
echo pull from GitHub...
git pull origin main

echo.
echo push to GAS...
clasp push

echo.
echo Upload : succes
pause