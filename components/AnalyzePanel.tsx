'use client';

import { useEffect, useState } from 'react';
import { getApiError, readJsonSafe } from '@/lib/api';
import { faNumber, formatBytes } from '@/lib/format';
import type { CriterionDefinition } from '@/lib/criteria';
import type {
  AnalyzeResponse,
  ApiErrorResponse,
  AttemptRecord,
  ConvertInfo,
  ThesisMeta,
} from '@/lib/types';
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  SparkIcon,
  SparklesIcon,
  SpinnerIcon,
} from './Icons';

interface AnalyzePanelProps {
  meta: ThesisMeta;
  markdown: string;
  convertInfo: ConvertInfo;
  criteria: CriterionDefinition[];
  templateId: string;
  templateName: string;
  onBack: () => void;
  onCompleted: (response: AnalyzeResponse, instructions: string) => void;
}

const STAGES = [
  { label: 'آماده‌سازی و فشرده‌سازی متن پایان‌نامه', at: 0 },
  { label: 'فراخوانی مدل هوش مصنوعی و دریافت ارزیابی', at: 3 },
  { label: 'اعتبارسنجی پاسخ و محاسبه‌ی نمره‌ی وزنی', at: 30 },
];

/** سقف انتظار برای پاسخ تحلیل (میلی‌ثانیه) */
const CLIENT_TIMEOUT_MS = 90_000;

/**
 * دستورهای آماده‌ی تحلیل. کاربر می‌تواند یکی را انتخاب یا متن دلخواه خودش را بنویسد
 * (مثلاً «بر اساس مدل CIPP تحلیل کن»).
 */
const INSTRUCTION_PRESETS = [
  {
    label: 'مدل CIPP',
    value:
      'تحلیل را بر اساس مدل CIPP انجام بده: زمینه (Context)، درونداد (Input)، فرایند (Process) و برونداد (Product). برای هر مؤلفه، شاهد از متن و پیشنهاد بهبود را جداگانه بنویس.',
  },
  {
    label: 'تحلیل SWOT',
    value:
      'تحلیل را با چارچوب SWOT (قوت‌ها، ضعف‌ها، فرصت‌ها، تهدیدها) سازمان‌دهی کن و در پایان سه اقدام اولویت‌دار برای رفع ضعف‌ها پیشنهاد بده.',
  },
  {
    label: 'تمرکز بر روش‌شناسی',
    value:
      'تمرکز اصلی ارزیابی را روی فصل روش‌شناسی بگذار: تناسب روش با سؤال پژوهش، روایی و پایایی ابزار، جامعه و نمونه، تحلیل داده و قابلیت تکرار. سایر معیارها را کوتاه‌تر جمع‌بندی کن.',
  },
];

export function AnalyzePanel({
  meta,
  markdown,
  convertInfo,
  criteria,
  templateId,
  templateName,
  onBack,
  onCompleted,
}: AnalyzePanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  /** دستور اختصاصی کاربر برای چارچوب/تمرکز تحلیل */
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (!analyzing) return;
    const startedAt = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    setAttempts([]);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          meta,
          instructions: instructions.trim() || undefined,
          template: {
            id: templateId,
            name: templateName,
            criteria: criteria.map((criterion) => ({
              name: criterion.name,
              weight: criterion.weight,
              description: criterion.description,
            })),
          },
        }),
        signal: controller.signal,
      });
      const payload = await readJsonSafe<AnalyzeResponse & ApiErrorResponse>(response);

      if (!response.ok || !payload || !payload.report) {
        setError(getApiError(payload, 'تحلیل ناموفق بود. لطفاً چند لحظه بعد دوباره تلاش کنید.'));
        setAttempts(payload?.attempts ?? []);
        return;
      }

      onCompleted(
        {
          report: payload.report,
          analysis: payload.analysis,
          template: payload.template,
        },
        instructions.trim(),
      );
    } catch (caught) {
      const aborted = caught instanceof DOMException && caught.name === 'AbortError';
      setError(
        aborted
          ? 'زمان انتظار برای پاسخ مدل به پایان رسید. لطفاً دوباره تلاش کنید یا فایل کوتاه‌تری بفرستید.'
          : 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.',
      );
    } finally {
      window.clearTimeout(timeout);
      setAnalyzing(false);
    }
  };

  const activeStage = elapsed < STAGES[1].at ? 0 : elapsed < STAGES[2].at ? 1 : 2;

  return (
    <section className="card space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">۴. تحلیل هوشمند</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {faNumber(criteria.length)} معیار قالب «{templateName}» با وزن مشخص ارزیابی می‌شود.
          </p>
        </div>
        <span className="chip shrink-0">گام ۴ از ۴</span>
      </div>

      <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-4 dark:border-indigo-400/25 dark:bg-indigo-500/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="instructions"
            className="flex items-center gap-1.5 text-sm font-bold text-indigo-900 dark:text-indigo-100"
          >
            <SparkIcon className="h-4 w-4" />
            دستور تحلیل (اختیاری)
          </label>
          <span className="text-[11px] font-medium text-indigo-700/80 dark:text-indigo-200/80">
            {faNumber(instructions.length)} / {faNumber(1500)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {INSTRUCTION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={analyzing}
              onClick={() => setInstructions(preset.value)}
              className="rounded-full border border-indigo-300/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-800 transition hover:bg-white disabled:opacity-60 dark:border-indigo-400/30 dark:bg-white/10 dark:text-indigo-100 dark:hover:bg-white/20"
            >
              {preset.label}
            </button>
          ))}
          {instructions ? (
            <button
              type="button"
              disabled={analyzing}
              onClick={() => setInstructions('')}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-indigo-700/70 underline-offset-4 hover:underline disabled:opacity-60 dark:text-indigo-200/70"
            >
              پاک کردن
            </button>
          ) : null}
        </div>

        <textarea
          id="instructions"
          className="field mt-2 min-h-[78px] resize-y"
          maxLength={1500}
          value={instructions}
          disabled={analyzing}
          placeholder="مثال: بر اساس مدل CIPP تحلیل کن و برای هر مؤلفه شاهد از متن بیاور."
          onChange={(event) => setInstructions(event.target.value)}
        />

        <p className="mt-1 text-[11px] leading-5 text-indigo-900/60 dark:text-indigo-200/60">
          این دستور فقط چارچوب و تمرکز گزارش را تغییر می‌دهد؛ قالب خروجی و مقیاس نمره‌دهی ثابت می‌ماند.
        </p>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">عنوان پایان‌نامه</dt>
          <dd className="mt-0.5 font-bold leading-6 text-slate-800">{meta.title}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">دانشجو</dt>
          <dd className="mt-0.5 font-bold leading-6 text-slate-800">
            {meta.studentName} — {meta.degree}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="flex items-center gap-1 text-slate-500">
            <FileTextIcon className="h-3.5 w-3.5" />
            فایل منبع
          </dt>
          <dd className="mt-0.5 break-words font-bold text-slate-800">
            {convertInfo.fileName} ({formatBytes(convertInfo.fileSize)})
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">حجم متن قابل ارزیابی</dt>
          <dd className="mt-0.5 font-bold text-slate-800">
            {faNumber(convertInfo.words)} کلمه — {faNumber(markdown.length)} کاراکتر
          </dd>
        </div>
      </dl>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm leading-7 text-indigo-900">
        <p className="flex items-center gap-2 font-semibold">
          <SparklesIcon className="h-4 w-4" />
          نحوه‌ی ارزیابی
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pr-5 text-[13px]">
          <li>
            ارزیابی با مدل DeepSeek انجام می‌شود؛ در صورت خطا (و در صورت تنظیم کلید) مدل‌های رایگان
            OpenRouter امتحان می‌شوند.
          </li>
          <li>
            نمره‌ی کل از میانگین وزنی {faNumber(criteria.length)} معیار این قالب در سرور محاسبه
            می‌شود، نه از خروجی مدل.
          </li>
          <li>ممکن است تحلیل تا حدود یک دقیقه طول بکشد؛ صفحه را نبندید.</li>
        </ul>
      </div>

      {error ? (
        <div className="alert-error space-y-2" role="alert">
          <p className="flex items-start gap-2">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
          {attempts.length ? (
            <ul className="space-y-1 rounded-lg bg-white/60 p-2 text-xs">
              {attempts.map((attempt, index) => (
                <li key={`${attempt.model}-${index}`} className="flex flex-wrap justify-between gap-2">
                  <span dir="ltr" className="font-medium">
                    {attempt.model}
                  </span>
                  <span>{attempt.error ?? 'ناموفق'}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {analyzing ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <SpinnerIcon className="h-4 w-4 animate-spin text-indigo-600" />
              در حال ارزیابی متن…
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <ClockIcon className="h-3.5 w-3.5" />
              {faNumber(elapsed)} ثانیه
            </span>
          </div>

          <ol className="space-y-2">
            {STAGES.map((stage, index) => {
              const done = index < activeStage;
              const active = index === activeStage;
              return (
                <li
                  key={stage.label}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                    active ? 'bg-white font-semibold text-indigo-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      done
                        ? 'bg-emerald-500 text-white'
                        : active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {done ? (
                      <CheckIcon className="h-3 w-3" />
                    ) : active ? (
                      <SpinnerIcon className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="text-[10px]">{faNumber(index + 1)}</span>
                    )}
                  </span>
                  {stage.label}
                </li>
              );
            })}
          </ol>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-l from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${Math.min(95, 12 + elapsed * 2.2)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={analyzing}>
          <ArrowRightIcon className="h-4 w-4" />
          بازگشت به فایل
        </button>
        <button type="button" className="btn-primary" onClick={() => void runAnalysis()} disabled={analyzing}>
          {analyzing ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              در حال تحلیل…
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              {error ? 'تلاش دوباره' : 'شروع ارزیابی هوشمند'}
            </>
          )}
        </button>
      </div>
    </section>
  );
}
