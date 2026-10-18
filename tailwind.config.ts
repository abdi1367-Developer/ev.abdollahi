import type { Config } from 'tailwindcss';

/**
 * پالت اصلی نارنجی است. کلیدهای قدیمی (indigo/sky/violet) هم به همین پالت
 * نگاشت شده‌اند تا کلاس‌های موجود در کامپوننت‌ها یکدست و بدون آبی دیده شوند.
 */
const orange = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407',
};

const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
};

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'IRANSansX', 'IRANSans', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(154, 52, 18, 0.22)',
        glass: '0 24px 70px -32px rgba(124, 45, 18, 0.38)',
        glow: '0 0 0 1px rgba(249, 115, 22, 0.2), 0 26px 70px -24px rgba(234, 88, 12, 0.5)',
      },
      colors: {
        brand: orange,
        indigo: orange,
        violet: orange,
        sky: amber,
        blue: amber,
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #c2410c 0%, #f97316 46%, #fbbf24 100%)',
        'brand-sheen':
          'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 72%)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '33%': { transform: 'translate3d(16px, -18px, 0) rotate(4deg)' },
          '66%': { transform: 'translate3d(-12px, 12px, 0) rotate(-4deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.08)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.45s ease-out both',
        float: 'float 9s ease-in-out infinite',
        'float-slow': 'float 14s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 8s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'bar-grow': 'bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
