'use client';

import { useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react';
import Link from 'next/link';
import { getApiError, readJsonSafe } from '@/lib/api';
import type { ApiErrorResponse, AuthResponse } from '@/lib/types';
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  ShieldIcon,
  SpinnerIcon,
} from './Icons';
import { ThemeToggle } from './ThemeToggle';
import { SiteLogo } from './SiteLogo';

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pointer, setPointer] = useState({ x: 72, y: 28 });

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await readJsonSafe<AuthResponse & ApiErrorResponse>(response);

      if (!response.ok || !payload?.user) {
        setError(getApiError(payload, 'ورود ناموفق بود. نام کاربری و رمز عبور را بررسی کنید.'));
        return;
      }

      window.location.replace(nextPath || '/');
    } catch {
      setError('ارتباط با سرور برقرار نشد. اتصال شبکه را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-stage -mx-4 -my-6 min-h-screen rounded-[2rem] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-my-10 lg:px-10 lg:py-10"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointer({ x: 72, y: 28 })}
    >
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div
        className="login-spotlight"
        style={
          {
            '--pointer-x': `${pointer.x}%`,
            '--pointer-y': `${pointer.y}%`,
          } as CSSProperties
        }
        aria-hidden="true"
      />
      <span className="floating-orb -left-12 top-20 h-32 w-32 animate-drift sm:h-44 sm:w-44" aria-hidden="true" />
      <span className="floating-orb -right-10 top-1/3 h-20 w-20 animate-float-slow sm:h-28 sm:w-28" aria-hidden="true" />
      <span className="floating-orb bottom-16 left-1/4 h-14 w-14 animate-float sm:h-20 sm:w-20" aria-hidden="true" />
      <span className="floating-orb bottom-1/4 right-1/3 h-10 w-10 animate-drift sm:h-14 sm:w-14" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-6 sm:gap-8 lg:min-h-[calc(100vh-9rem)] lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
        <section className="order-2 space-y-6 text-slate-900 lg:order-1 dark:text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/60 px-3 py-1.5 text-[11px] font-bold text-orange-800 shadow-sm backdrop-blur-xl dark:border-orange-400/25 dark:bg-white/[0.07] dark:text-orange-200">
            <ShieldIcon className="h-3.5 w-3.5" />
            درباره ما
          </span>

          <div>
            <h1 className="text-2xl font-extrabold leading-[1.5] sm:text-4xl sm:leading-[1.45]">
              ارزیاب هوشمند
              <span className="block bg-brand-gradient bg-clip-text text-transparent">پایان‌نامه</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px] dark:text-slate-300">
              فایل پایان‌نامه را بارگذاری کنید، قالب و وزن معیارها را تنظیم کنید و گزارش
              ساختارمند با نمودارهای تحلیلی دریافت کنید.
            </p>
          </div>

          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
              'قالب‌های قابل ویرایش و سفارشی',
              'خروجی Markdown و JSON',
              'داشبورد تحلیلی ارزیابی',
              'بایگانی امن سوابق',
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/50 px-3 py-2.5 text-xs font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 underline-offset-4 hover:underline dark:text-orange-300"
          >
            معرفی کامل سامانه
            <ArrowLeftIcon className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="spotlight-panel order-1 w-full rounded-[2rem] p-5 sm:p-8 lg:order-2 lg:max-w-md lg:justify-self-start">
          <div className="mb-5 flex items-center gap-3">
            <SiteLogo size={44} priority />
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">ورود به سامانه</h2>
            </div>
          </div>

        {error ? (
          <div className="alert-error flex items-start gap-2" role="alert">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="username">
              نام کاربری
            </label>
            <input
              id="username"
              className="field ltr"
              value={username}
              autoComplete="username"
              autoFocus
              maxLength={32}
              disabled={loading}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="label" htmlFor="password">
                رمز عبور
              </label>
              <button
                type="button"
                className="mb-1.5 text-[11px] font-semibold text-orange-700 underline-offset-4 hover:underline dark:text-orange-300"
                onClick={() => setShowPassword((value) => !value)}
                tabIndex={-1}
              >
                {showPassword ? 'پنهان کردن' : 'نمایش رمز'}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="field ltr"
              value={password}
              autoComplete="current-password"
              maxLength={128}
              disabled={loading}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                در حال ورود…
              </>
            ) : (
              <>
                ورود به سامانه
                <ArrowLeftIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </section>
      </div>
    </div>
  );
}
