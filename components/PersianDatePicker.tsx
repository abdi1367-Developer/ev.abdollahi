'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  formatJalali,
  formatJalaliShort,
  isoToJalali,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
  jalaliToIso,
  todayIso,
  type JalaliDate,
} from '@/lib/jalali';
import { CalendarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from './Icons';

interface PersianDatePickerProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}

const fa = (value: number) => new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(value);

export function PersianDatePicker({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = 'انتخاب تاریخ دفاع',
}: PersianDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => isoToJalali(value), [value]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<JalaliDate | null>(null);
  const today = todayIso();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (!open) {
      const base = selected ?? isoToJalali(today);
      if (base) setView(base);
    }
    setOpen((state) => !state);
  };

  const choose = (jy: number, jm: number, jd: number) => {
    onChange(jalaliToIso(jy, jm, jd));
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    if (!view) return;
    let jm = view.jm + delta;
    let jy = view.jy;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    } else if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setView({ ...view, jy, jm });
  };

  const cells = useMemo(() => {
    if (!view) return [] as Array<number | null>;
    const length = jalaliMonthLength(view.jy, view.jm);
    const offset = jalaliMonthStartWeekday(view.jy, view.jm);
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length }, (_, index) => index + 1),
    ] as Array<number | null>;
  }, [view]);

  const selectedIso = selected ? jalaliToIso(selected.jy, selected.jm, selected.jd) : '';

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        className={`field flex items-center justify-between gap-2 text-right ${
          invalid ? 'field-error' : ''
        } ${!selected ? 'text-slate-400 dark:text-slate-500' : ''}`}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0 text-orange-500" />
          <span className="truncate">
            {selected ? formatJalali(selected.jy, selected.jm, selected.jd) : placeholder}
          </span>
        </span>
        <span className="shrink-0 text-[10px] font-semibold text-slate-400">
          {selected ? formatJalaliShort(selected.jy, selected.jm, selected.jd) : 'شمسی'}
        </span>
      </button>

      {open && view ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[19rem] max-w-[calc(100vw-2rem)] rounded-3xl border border-white/70 bg-white/95 p-3 shadow-glass backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95"
          role="dialog"
          aria-modal="false"
          aria-label="تقویم شمسی"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="btn-ghost !px-2"
              onClick={() => shiftMonth(-1)}
              aria-label="ماه قبل"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {JALALI_MONTHS[view.jm - 1]} {fa(view.jy)}
            </p>
            <button
              type="button"
              className="btn-ghost !px-2"
              onClick={() => shiftMonth(1)}
              aria-label="ماه بعد"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {JALALI_WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-[11px] font-bold text-slate-400">
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} />;
              const iso = jalaliToIso(view.jy, view.jm, day);
              const isSelected = iso === selectedIso;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => choose(view.jy, view.jm, day)}
                  className={`grid h-8 place-items-center rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : isToday
                        ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-100 dark:ring-orange-400/30'
                        : 'text-slate-700 hover:bg-orange-50 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
                  aria-label={formatJalali(view.jy, view.jm, day)}
                  aria-pressed={isSelected}
                >
                  {fa(day)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-white/10">
            <button
              type="button"
              className="btn-ghost !px-2 !py-1 text-xs text-orange-700 dark:text-orange-300"
              onClick={() => {
                const current = isoToJalali(today);
                if (current) choose(current.jy, current.jm, current.jd);
              }}
            >
              <CheckIcon className="h-3.5 w-3.5" />
              امروز
            </button>
            {value ? (
              <button
                type="button"
                className="btn-ghost !px-2 !py-1 text-xs text-slate-500"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                <XIcon className="h-3.5 w-3.5" />
                پاک کردن
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

