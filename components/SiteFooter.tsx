'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SiteLogo } from './SiteLogo';

const AUTHOR_NAME = 'ع.ع';

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <footer className="mt-8 border-t border-white/50 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex w-full flex-col gap-4 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 2xl:px-16">
        <div className="flex items-start gap-3">
          <SiteLogo size={36} className="shadow-orange-600/25" />
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">ارزیاب هوشمند پایان‌نامه</p>
            <p className="mt-1 max-w-2xl text-[11px] leading-6 text-slate-500 dark:text-slate-400">
              طراحی و توسعه: {AUTHOR_NAME}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/" className="transition hover:text-orange-700 dark:hover:text-orange-300">
            ارزیابی جدید
          </Link>
          <Link href="/history" className="transition hover:text-orange-700 dark:hover:text-orange-300">
            سوابق ارزیابی
          </Link>
          <Link href="/about" className="transition hover:text-orange-700 dark:hover:text-orange-300">
            درباره ما
          </Link>
        </nav>
      </div>
    </footer>
  );
}
