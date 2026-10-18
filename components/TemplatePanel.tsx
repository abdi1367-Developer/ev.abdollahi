'use client';

import { useEffect, useMemo, useState } from 'react';
import { faNumber } from '@/lib/format';
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_TEMPLATE,
  cloneCriteria,
  createEmptyCriterion,
  findBuiltInTemplate,
  sumCriteriaWeights,
  type EvaluationTemplate,
} from '@/lib/templates';
import {
  deleteCustomTemplate,
  readCustomTemplates,
  saveCustomTemplate,
} from '@/lib/template-store';
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  LayersIcon,
  SaveIcon,
  SparklesIcon,
  TrashIcon,
} from './Icons';

interface TemplatePanelProps {
  value: EvaluationTemplate;
  onChange: (template: EvaluationTemplate) => void;
  onNext: () => void;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function TemplatePanel({ value, onChange, onNext }: TemplatePanelProps) {
  const [customTemplates, setCustomTemplates] = useState<EvaluationTemplate[]>([]);
  const [saveName, setSaveName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCustomTemplates(readCustomTemplates());
  }, []);

  const templates = useMemo(
    () => [...BUILT_IN_TEMPLATES, ...customTemplates],
    [customTemplates],
  );

  const total = sumCriteriaWeights(value.criteria);
  const invalidTemplateName = value.name.trim().length < 2;
  const isEmptyTitle = value.criteria.some((criterion) => criterion.name.trim().length < 2);
  const invalidWeight = value.criteria.some((criterion) => !(Number(criterion.weight) > 0));
  const duplicate = useMemo(() => {
    const names = value.criteria.map((criterion) => criterion.name.trim().toLowerCase());
    return new Set(names).size !== names.length;
  }, [value.criteria]);
  const canContinue =
    value.criteria.length > 0 &&
    total > 0 &&
    !invalidTemplateName &&
    !invalidWeight &&
    !isEmptyTitle &&
    !duplicate;

  const update = (next: Partial<EvaluationTemplate>) => {
    setMessage('');
    setError('');
    onChange({ ...value, ...next });
  };

  const updateCriterion = (
    index: number,
    patch: Partial<{ name: string; weight: number; description: string }>,
  ) => {
    const criteria = value.criteria.map((criterion, i) =>
      i === index ? { ...criterion, ...patch } : criterion,
    );
    update({ criteria });
  };

  const addCriterion = () => {
    if (value.criteria.length >= 20) {
      setError('حداکثر ۲۰ معیار برای یک قالب مجاز است.');
      return;
    }
    update({ criteria: [...value.criteria, createEmptyCriterion(value.criteria.length)] });
  };

  const removeCriterion = (index: number) => {
    if (value.criteria.length <= 1) {
      setError('قالب باید حداقل یک معیار داشته باشد.');
      return;
    }
    update({ criteria: value.criteria.filter((_, i) => i !== index) });
  };

  const distributeWeights = () => {
    const count = value.criteria.length;
    if (!count) return;
    const base = round1(100 / count);
    const criteria = value.criteria.map((criterion, index) => ({
      ...criterion,
      weight: index === count - 1 ? round1(100 - base * (count - 1)) : base,
    }));
    update({ criteria });
  };

  const selectTemplate = (template: EvaluationTemplate) => {
    setSaveName('');
    setMessage('');
    setError('');
    onChange({ ...template, criteria: cloneCriteria(template.criteria) });
  };

  const handleSaveCustom = () => {
    const name = (saveName || (value.builtIn ? '' : value.name)).trim();
    if (name.length < 2) {
      setError('برای ذخیره‌ی قالب، یک نام حداقل ۲ کاراکتری وارد کنید.');
      return;
    }
    if (!canContinue) {
      setError('پیش از ذخیره، نام معیارها و وزن‌ها را کامل و یکتا کنید.');
      return;
    }

    const saved = saveCustomTemplate({
      ...value,
      id: value.builtIn ? 'new' : value.id,
      name,
      builtIn: false,
      criteria: cloneCriteria(value.criteria),
    });

    if (!saved) {
      setError('ذخیره‌ی قالب در مرورگر ناموفق بود.');
      return;
    }

    setCustomTemplates(readCustomTemplates());
    onChange({ ...saved, criteria: cloneCriteria(saved.criteria) });
    setSaveName('');
    setMessage(`قالب «${saved.name}» ذخیره شد.`);
  };

  const handleDeleteCustom = () => {
    if (value.builtIn) return;
    if (!window.confirm(`قالب «${value.name}» حذف شود؟`)) return;
    deleteCustomTemplate(value.id);
    setCustomTemplates(readCustomTemplates());
    onChange({ ...DEFAULT_TEMPLATE, criteria: cloneCriteria(DEFAULT_TEMPLATE.criteria) });
    setMessage('قالب سفارشی حذف شد.');
  };

  const resetTemplate = () => {
    const original = findBuiltInTemplate(value.id);
    if (!original) {
      onChange({ ...DEFAULT_TEMPLATE, criteria: cloneCriteria(DEFAULT_TEMPLATE.criteria) });
      return;
    }
    onChange({ ...original, criteria: cloneCriteria(original.criteria) });
    setMessage('تغییرات قالب به حالت اولیه بازگشت.');
  };

  return (
    <section className="card space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">۱. قالب ارزیابی</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
            یکی از قالب‌های آماده را انتخاب کنید یا نام و وزن معیارها را خودتان تنظیم کنید.
          </p>
        </div>
        <span className="chip shrink-0">گام ۱ از ۴</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((template) => {
          const selected = template.id === value.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              className={`rounded-2xl border p-3 text-right transition ${
                selected
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-500/20 dark:border-indigo-400/50 dark:bg-indigo-500/15'
                  : 'border-slate-200 bg-white/70 hover:border-indigo-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/40'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {template.name}
                </span>
                {selected ? (
                  <CheckIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                ) : null}
              </span>
              <span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                {template.description}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">{faNumber(template.criteria.length)} معیار</span>
                <span className="chip">{faNumber(sumCriteriaWeights(template.criteria))}٪</span>
                {!template.builtIn ? <span className="chip-brand">سفارشی</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
              <LayersIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
              ویرایش قالب
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              نام قالب و عنوان هر معیار قابل تغییر است. می‌توانید معیار جدید اضافه کنید.
            </p>
          </div>
          <span
            className={`chip ${
              Math.abs(total - 100) < 0.01
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            جمع وزن‌ها: {faNumber(total)}٪
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="label" htmlFor="template-name">
              نام قالب
            </label>
            <input
              id="template-name"
              className="field"
              value={value.name}
              maxLength={120}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="مثال: قالب داوری مهندسی کامپیوتر"
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button type="button" className="btn-secondary" onClick={distributeWeights}>
              توزیع مساوی وزن‌ها
            </button>
            <button type="button" className="btn-ghost" onClick={resetTemplate}>
              بازگرداندن
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {value.criteria.map((criterion, index) => (
            <div
              key={criterion.key || `criterion-${index}`}
              className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="grid gap-2 sm:grid-cols-[auto_1fr_100px_auto] sm:items-end">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                  {faNumber(index + 1)}
                </span>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    عنوان معیار
                  </label>
                  <input
                    className="field py-2"
                    value={criterion.name}
                    maxLength={120}
                    onChange={(event) => updateCriterion(index, { name: event.target.value })}
                    placeholder="مثال: نوآوری فنی"
                    aria-label={`عنوان معیار ${index + 1}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    وزن (٪)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.5}
                    className="field py-2 tabular-nums"
                    value={criterion.weight}
                    onChange={(event) =>
                      updateCriterion(index, { weight: Number(event.target.value) || 0 })
                    }
                    aria-label={`وزن معیار ${index + 1}`}
                    dir="ltr"
                  />
                </div>
                <button
                  type="button"
                  className="btn-danger h-10"
                  onClick={() => removeCriterion(index)}
                  aria-label={`حذف معیار ${criterion.name || index + 1}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <input
                className="field mt-2 py-1.5 text-xs"
                value={criterion.description}
                maxLength={800}
                onChange={(event) => updateCriterion(index, { description: event.target.value })}
                placeholder="توضیح کوتاه معیار برای راهنمایی مدل (اختیاری)"
                aria-label={`توضیح معیار ${index + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={addCriterion}>
            <SparklesIcon className="h-4 w-4" />
            افزودن معیار
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            اگر جمع وزن‌ها ۱۰۰ نباشد، نمره‌ی نهایی به‌صورت نسبی محاسبه می‌شود.
          </span>
        </div>

        {invalidTemplateName ? (
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
            <AlertIcon className="h-3.5 w-3.5" />
            نام قالب باید حداقل ۲ کاراکتر باشد.
          </p>
        ) : null}
        {isEmptyTitle ? (
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
            <AlertIcon className="h-3.5 w-3.5" />
            عنوان همه‌ی معیارها باید حداقل ۲ کاراکتر باشد.
          </p>
        ) : null}
        {duplicate ? (
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
            <AlertIcon className="h-3.5 w-3.5" />
            عنوان معیارها نباید تکراری باشد.
          </p>
        ) : null}
        {invalidWeight ? (
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
            <AlertIcon className="h-3.5 w-3.5" />
            وزن هر معیار باید بزرگ‌تر از صفر باشد.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-4 dark:border-indigo-400/25 dark:bg-indigo-500/10">
        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
          ذخیره‌ی قالب برای استفاده‌های بعدی
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="field"
            value={saveName}
            maxLength={120}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder={value.builtIn ? 'نام قالب سفارشی جدید (مثلاً رشته‌ی من)' : value.name}
            aria-label="نام قالب سفارشی"
          />
          <button type="button" className="btn-primary shrink-0" onClick={handleSaveCustom}>
            <SaveIcon className="h-4 w-4" />
            ذخیره به‌عنوان قالب
          </button>
          {!value.builtIn ? (
            <button type="button" className="btn-danger shrink-0" onClick={handleDeleteCustom}>
              <TrashIcon className="h-4 w-4" />
              حذف قالب
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-indigo-900/70 dark:text-indigo-200/70">
          قالب‌های سفارشی در همین مرورگر ذخیره می‌شوند و در گام‌های بعد برای ارزیابی استفاده
          می‌شوند.
        </p>
        {message ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckIcon className="h-3.5 w-3.5" />
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <AlertIcon className="h-3.5 w-3.5" />
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end border-t border-slate-200/70 pt-4 dark:border-white/10">
        <button
          type="button"
          className="btn-primary"
          disabled={!canContinue}
          onClick={() => {
            if (!canContinue) {
              setError('قالب ارزیابی را کامل کنید.');
              return;
            }
            onNext();
          }}
        >
          ادامه و تکمیل مشخصات
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

