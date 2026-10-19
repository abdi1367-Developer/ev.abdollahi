'use client';

import { EVALUATION_MODES } from '@/lib/evaluation-mode';
import type { EvaluationMode } from '@/lib/types';
import { CheckIcon } from './Icons';

interface EvaluationModePickerProps {
  value: EvaluationMode;
  onChange: (mode: EvaluationMode) => void;
  disabled?: boolean;
}

/**
 * انتخاب «نوع ارزیابی»: خوش‌بینانه، متعادل یا بدبینانه.
 * فقط سخت‌گیری و لحن داوری را تغییر می‌دهد؛ ساختار گزارش ثابت است.
 */
export function EvaluationModePicker({
  value,
  onChange,
  disabled = false,
}: EvaluationModePickerProps) {
  return (
    <fieldset
      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
      disabled={disabled}
    >
      <legend className="px-1 text-sm font-bold text-slate-800 dark:text-slate-100">نوع ارزیابی</legend>
      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        حالت انتخابی فقط میزان سخت‌گیری داور و لحن گزارش را تعیین می‌کند.
      </p>

      <div role="radiogroup" aria-label="نوع ارزیابی" className="mt-3 grid gap-2 sm:grid-cols-3">
        {EVALUATION_MODES.map((mode) => {
          const active = mode.id === value;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(mode.id)}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? mode.activeClass
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{mode.label}</span>
                {active ? <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : null}
              </span>
              <span className="text-[11px] leading-5 text-slate-600 dark:text-slate-300">{mode.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
