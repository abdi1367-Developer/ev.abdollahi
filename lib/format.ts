import type { ThesisMeta } from './types';

/** تاریخ شمسی خوانا (مثلاً ۱۲ مرداد ۱۴۰۳ - ۱۴:۳۰) */
export function formatFaDate(iso: string, withTime = true): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
  } catch {
    return iso;
  }
}

/** نمایش حجم فایل به‌صورت خوانا */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '۰ بایت';
  const units = ['بایت', 'کیلوبایت', 'مگابایت'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  const formatted = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value);
  return `${formatted} ${units[index]}`;
}

/** تبدیل اعداد لاتین به فارسی برای نمایش */
export function faNumber(value: number | string, fractionDigits?: number): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: fractionDigits ?? 1,
    minimumFractionDigits: fractionDigits ?? 0,
  }).format(num);
}

/** ساخت نام فایل امن و خوانا برای دانلود */
export function buildDownloadName(meta: Pick<ThesisMeta, 'studentName' | 'title'>, suffix: string, extension: string): string {
  const raw = [suffix, meta.studentName, meta.title].filter(Boolean).join('-');
  const safe = raw
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 90);
  return `${safe || 'thesis-report'}.${extension}`;
}
