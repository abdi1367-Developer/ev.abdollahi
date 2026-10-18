/**
 * تبدیل تاریخ میلادی/شمسی بدون وابستگی خارجی.
 * الگوریتم بر پایه‌ی محاسبات تقویم جلالی است و برای سال‌های رایج
 * (۱۳۰۰ تا ۱۵۰۰) دقیق است.
 */

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const JALALI_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  let bl = BREAKS.length;
  let gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    // خارج از بازه‌ی پشتیبانی‌شده؛ نزدیک‌ترین بازه استفاده می‌شود.
    jy = Math.min(Math.max(jy, BREAKS[0]), BREAKS[bl - 2]);
    gy = jy + 621;
    jp = BREAKS[0];
  }

  for (let i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jd = 0;
  let jm = 0;
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

export function toJalaliFromGregorian(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toJalali(date: Date): JalaliDate {
  return toJalaliFromGregorian(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy.toString().padStart(4, '0')}-${g.gm.toString().padStart(2, '0')}-${g.gd
    .toString()
    .padStart(2, '0')}`;
}

export function isoToJalali(iso: string): JalaliDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  return toJalaliFromGregorian(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function todayIso(): string {
  const today = toJalali(new Date());
  return jalaliToIso(today.jy, today.jm, today.jd);
}

export function todayJalali(): JalaliDate {
  return toJalali(new Date());
}

function fa(value: number): string {
  return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(value);
}

export function formatJalali(jy: number, jm: number, jd: number): string {
  return `${fa(jd)} ${JALALI_MONTHS[jm - 1] ?? ''} ${fa(jy)}`;
}

export function formatJalaliShort(jy: number, jm: number, jd: number): string {
  return `${fa(jy)}/${fa(jm).padStart(2, '۰')}/${fa(jd).padStart(2, '۰')}`;
}

export function formatJalaliIso(iso: string): string {
  const parsed = isoToJalali(iso);
  if (!parsed) return '—';
  return formatJalali(parsed.jy, parsed.jm, parsed.jd);
}

/** روز هفته‌ی اول ماه (شنبه = ۰) برای چیدمان تقویم */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const iso = jalaliToIso(jy, jm, 1);
  const [gy, gm, gd] = iso.split('-').map(Number);
  return (new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay() + 1) % 7;
}
