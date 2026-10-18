'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { readJsonSafe } from '@/lib/api';
import type { AuthResponse, PublicUser } from '@/lib/types';
import {
  ChartIcon,
  InfoIcon,
  LogoutIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
} from './Icons';
import { ThemeToggle } from './ThemeToggle';
import { SiteLogo } from './SiteLogo';

const NAV_ITEMS = [
  { href: '/', label: 'ارزیابی جدید', icon: SparklesIcon },
  { href: '/history', label: 'سوابق ارزیابی', icon: ChartIcon },
  { href: '/about', label: 'درباره ما', icon: InfoIcon },
];

const ADMIN_ITEM = { href: '/admin/users', label: 'مدیریت کاربران', icon: ShieldIcon };

export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const payload = await readJsonSafe<AuthResponse>(response);
        if (!cancelled && response.ok && payload?.user) setUser(payload.user);
      } catch {
        // بدون نشست، دکمه‌ی ورود نمایش داده می‌شود
      }
    };
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setLoggingOut(false);
      router.replace('/login');
      router.refresh();
    }
  };

  const navItems = [
    ...NAV_ITEMS,
    ...(user?.role === 'admin' ? [ADMIN_ITEM] : []),
  ];

  // صفحه‌ی ورود، صحنه‌ی مستقل و تمام‌صفحه دارد.
  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10 2xl:px-16">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        >
          <SiteLogo size={40} priority />
          <span className="hidden leading-tight min-[400px]:block">
            <span className="block text-sm font-extrabold text-slate-900 sm:text-base dark:text-white">
              ارزیاب پایان‌نامه
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
              تبدیل، ارزیابی و بایگانی گزارش
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {user ? (
            <>
              <nav
                aria-label="ناوبری اصلی"
                className="flex items-center gap-1 overflow-x-auto text-xs sm:text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {navItems.map((item) => {
                  const active =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.label}
                      title={item.label}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 font-semibold transition sm:px-3 ${
                        active
                          ? 'bg-indigo-500/10 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-400/25'
                          : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <span
                className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10"
                aria-hidden="true"
              />
            </>
          ) : null}

          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden items-center gap-1.5 rounded-xl bg-slate-900/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 md:inline-flex dark:bg-white/10 dark:text-slate-200">
                <UserIcon className="h-3.5 w-3.5" />
                {user.displayName}
                {user.role === 'admin' ? (
                  <span className="rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:text-indigo-200">
                    مدیر
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-60 dark:text-slate-300 dark:hover:text-rose-300"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                title="خروج از حساب"
              >
                <LogoutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          ) : pathname !== '/login' ? (
            <Link href="/login" className="btn-secondary px-3 py-2 text-xs">
              ورود
            </Link>
          ) : null}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
