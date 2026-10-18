'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-xl py-14 text-center">
      <h1 className="text-lg font-bold text-slate-900">خطایی رخ داد</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        در پردازش درخواست شما مشکلی پیش آمد. می‌توانید دوباره تلاش کنید؛ اگر خطا ادامه داشت، صفحه را
        بازخوانی کنید. برای عیب‌یابی، وضعیت محیط اجرا را در مسیر{' '}
        <span className="ltr inline-block font-mono text-xs">/api/health</span> ببینید و لاگ
        Functionها را در Vercel بررسی کنید.
      </p>
      {error.digest ? (
        <p className="mt-2 text-[11px] text-slate-400">
          کد خطا: <span className="ltr inline-block">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary" onClick={reset}>
          تلاش دوباره
        </button>
        <Link href="/" className="btn-secondary">
          صفحه‌ی اصلی
        </Link>
      </div>
    </div>
  );
}
