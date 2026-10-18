import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSessionUserFromCookies } from '@/lib/auth-server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const AUTHOR_NAME = 'علی عبدالهی';

export const metadata: Metadata = {
  title: {
    default: 'ارزیاب هوشمند پایان‌نامه',
    template: '%s | ارزیاب پایان‌نامه',
  },
  description:
    'آپلود پایان‌نامه به‌صورت Word یا PDF، تبدیل به Markdown و ارزیابی هوشمند با قالب‌های معیارمحور قابل تنظیم، گزارش قابل دانلود و بایگانی سوابق.',
  applicationName: 'ارزیاب پایان‌نامه',
  authors: [{ name: AUTHOR_NAME }],
  creator: AUTHOR_NAME,
  keywords: ['ارزیابی پایان‌نامه', 'هوش مصنوعی', 'Markdown', 'داوری علمی', 'علی عبدالهی'],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff9f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0906' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * این اسکریپت پیش از رندر شدن صفحه اجرا می‌شود تا تم انتخاب‌شده
 * (روز/شب) بدون پرش رنگ اعمال شود.
 */
const THEME_SCRIPT = `(function(){try{var k='thesis-evaluator:theme';var s=localStorage.getItem(k);var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // کاربر در سرور خوانده می‌شود تا دکمه‌ی ورود/خروج همین ابتدا در HTML باشد و
  // اگر اسکریپت‌ها دیر بارگذاری شوند یا /api/auth/me در دسترس نباشد، هدر خالی نماند.
  const user = await getSessionUserFromCookies();

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/*
          فونت فارسی از CDN بارگذاری می‌شود؛ اگر در دسترس نباشد،
          استک فونت سیستمی (Tahoma و …) جایگزین می‌شود و ظاهر صفحه خراب نمی‌شود.
        */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader initialUser={user} />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 2xl:px-16">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
