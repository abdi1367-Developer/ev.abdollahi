/**
 * کلاس‌های Tailwind مشترک برای یکدست بودن ظاهر برنامه.
 * (فقط رشته است؛ هیچ وابستگی‌ای ندارد و در کلاینت/سرور قابل استفاده است.)
 */

export const cardClass =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

export const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export const errorTextClass = 'mt-1 text-xs font-medium text-rose-600';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60';

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50';

export const chipClass =
  'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600';

export const sectionTitleClass = 'text-lg font-bold text-slate-900 sm:text-xl';

/** رنگ نوار/حلقه‌ی نمره بر اساس مقدار ۰ تا ۱۰۰ */
export function scoreTone(score: number): { text: string; bar: string; ring: string; label: string } {
  if (score >= 90) {
    return {
      text: 'text-emerald-700',
      bar: 'bg-emerald-600',
      ring: 'stroke-emerald-600',
      label: 'عالی',
    };
  }
  if (score >= 80) {
    return {
      text: 'text-emerald-600',
      bar: 'bg-emerald-500',
      ring: 'stroke-emerald-500',
      label: 'خوب',
    };
  }
  if (score >= 70) {
    return {
      text: 'text-amber-600',
      bar: 'bg-amber-500',
      ring: 'stroke-amber-500',
      label: 'قابل قبول',
    };
  }
  return {
    text: 'text-rose-600',
    bar: 'bg-rose-500',
    ring: 'stroke-rose-500',
    label: 'نیازمند بازنگری',
  };
}
