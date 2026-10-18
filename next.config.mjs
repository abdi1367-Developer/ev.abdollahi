/**
 * تنظیمات Next.js — سازگار با Vercel (Serverless).
 *
 * نکته مهم: بسته‌ی `mammoth` به‌صورت external نگه داشته می‌شود تا در زمان build
 * به‌جای باندل شدن، مستقیماً از node_modules توسط Node require شود؛ این کار
 * از خطاهای رایج باندل‌کردن کتابخانه‌های قدیمی CJS روی Vercel جلوگیری می‌کند.
 * کتابخانه‌ی `unpdf` برعکس، مخصوص محیط Serverless نوشته شده و باندل می‌شود.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mammoth'],
  },
};

export default nextConfig;
