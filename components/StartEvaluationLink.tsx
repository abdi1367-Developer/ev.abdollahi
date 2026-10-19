'use client';

import { START_EVALUATION_EVENT } from '@/lib/evaluation-events';
import { ArrowLeftIcon } from './Icons';

/**
 * لینک «شروع ارزیابی» در بنر صفحه‌ی اصلی.
 *
 * علاوه بر اسکرول به بخش ارزیابی، رویداد شروع ارزیابی جدید را هم ارسال می‌کند
 * تا اگر گزارش نهایی باز باشد، ویزارد به مرحله‌ی انتخاب قالب برگردد.
 */
export function StartEvaluationLink() {
  const handleClick = () => {
    window.dispatchEvent(new Event(START_EVALUATION_EVENT));
  };

  return (
    <a
      href="#evaluation"
      onClick={handleClick}
      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-orange-700 shadow-lg transition hover:bg-orange-50 sm:text-sm"
    >
      شروع ارزیابی
      <ArrowLeftIcon className="h-4 w-4" />
    </a>
  );
}
