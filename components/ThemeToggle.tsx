'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './Icons';

const STORAGE_KEY = 'thesis-evaluator:theme';

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/** کلید سوییچ تم روز/شب — انتخاب کاربر در localStorage نگه داشته می‌شود */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setReady(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // اگر localStorage در دسترس نبود، تم فقط برای همین نشست اعمال می‌شود
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'روشن‌کردن ظاهر روز' : 'فعال‌کردن ظاهر شب'}
      title={dark ? 'ظاهر روز' : 'ظاهر شب'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/70 text-slate-600 shadow-sm backdrop-blur transition hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:border-indigo-400/40 dark:hover:text-amber-200 ${className}`}
    >
      <span className="sr-only">{dark ? 'ظاهر روز' : 'ظاهر شب'}</span>
      {ready && dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
