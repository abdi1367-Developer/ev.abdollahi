@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo ==========================================
echo  1) وضعیت فایل‌ها
echo ==========================================
git status --short

echo.
echo ==========================================
echo  2) بررسی تایپ‌ها و ساخت نسخه تولیدی
echo ==========================================
call npm run typecheck && call npm run build

if errorlevel 1 (
  echo.
  echo ==== FAILED: خطای بالا را برای رفع ارسال کنید (push انجام نشد) ====
  pause
  exit /b 1
)

echo.
echo ==========================================
echo  3) commit و push
echo ==========================================
git add -A && git commit -m "fix: DeepSeek primary model, health endpoint, robust auth for Vercel" && git push origin main

echo.
echo ==== EXIT CODE: %errorlevel% ====
echo ==== اگر 0 بود، GitHub و Vercel به‌روز شده‌اند ====
pause
