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
  EditIcon,
  LayersIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  TrashIcon,
} from './Icons';

interface TemplateWorkbenchProps {
  value: EvaluationTemplate;
  onChange: (template: EvaluationTemplate) => void;
  onNext: () => void;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function asEditable(template: EvaluationTemplate): EvaluationTemplate {
  return { ...template, criteria: cloneCriteria(template.criteria) };
}

export function TemplateWorkbench({ value, onChange, onNext }: TemplateWorkbenchProps) {
  const [customTemplates, setCustomTemplates] = useState<EvaluationTemplate[]>([]);
  const [newName, setNewName] = useState('');
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
  const invalidName = value.name.trim().length < 2;
  const emptyCriterion = value.criteria.some((criterion) => criterion.name.trim().length < 2);
  const invalidWeight = value.criteria.some((criterion) => !(Number(criterion.weight) > 0));
  const duplicate = useMemo(() => {
    const names = value.criteria.map((criterion) => criterion.name.trim().toLowerCase());
    return new Set(names).size !== names.length;
  }, [value.criteria]);
  const ready =
    value.criteria.length > 0 &&
    total > 0 &&
    !invalidName &&
    !invalidWeight &&
    !emptyCriterion &&
    !duplicate;

  const update = (patch: Partial<EvaluationTemplate>) => {
    setMessage('');
    setError('');
    onChange({ ...value, ...patch });
  };

  const updateCriterion = (
    index: number,
    patch: Partial<{ name: string; weight: number; description: string }>,
  ) => {
    update({
      criteria: value.criteria.map((criterion, i) =>
        i === index ? { ...criterion, ...patch } : criterion,
      ),
    });
  };

  const selectTemplate = (template: EvaluationTemplate) => {
    setMessage('');
    setError('');
    setNewName('');
    onChange(asEditable(template));
  };

  const addCriterion = () => {
    if (value.criteria.length >= 20) {
      setError('حداکثر ۲۰ معیار مجاز است.');
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
    update({
      criteria: value.criteria.map((criterion, index) => ({
        ...criterion,
        weight: index === count - 1 ? round1(100 - base * (count - 1)) : base,
      })),
    });
  };

  const resetCurrent = () => {
    const source =
      findBuiltInTemplate(value.id) ??
      readCustomTemplates().find((template) => template.id === value.id) ??
      DEFAULT_TEMPLATE;
    onChange(asEditable(source));
    setMessage('تغییرات به نسخه‌ی اصلی برگشت.');
    setError('');
  };

  const persist = (template: EvaluationTemplate, successMessage: string) => {
    if (template.name.trim().length < 2) {
      setError('نام قالب باید حداقل ۲ کاراکتر باشد.');
      return;
    }
    if (
      template.criteria.some(
        (criterion) => criterion.name.trim().length < 2 || !(Number(criterion.weight) > 0),
      )
    ) {
      setError('نام و وزن همه‌ی معیارها را کامل کنید.');
      return;
    }
    const names = template.criteria.map((criterion) => criterion.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      setError('نام معیارها نباید تکراری باشد.');
      return;
    }
    const saved = saveCustomTemplate(template);
    if (!saved) {
      setError('ذخیره‌ی قالب ناموفق بود. نام و معیارها را بررسی کنید.');
      return;
    }
    setCustomTemplates(readCustomTemplates());
    onChange(asEditable(saved));
    setNewName('');
    setError('');
    setMessage(successMessage);
  };

  const saveCurrent = () => {
    if (value.builtIn) {
      setError('برای تغییر قالب‌های پیش‌فرض، آن را با یک نام جدید ذخیره کنید.');
      return;
    }
    persist({ ...value, builtIn: false }, `تغییرات قالب «${value.name.trim()}» ذخیره شد.`);
  };

  const saveAsNew = () => {
    const name = newName.trim();
    if (name.length < 2) {
      setError('نام قالب جدید را وارد کنید.');
      return;
    }
    persist(
      { ...value, id: 'new', name, builtIn: false },
      `قالب «${name}» ساخته شد.`,
    );
  };

  const removeCustom = () => {
    if (value.builtIn) return;
    if (!window.confirm(`قالب «${value.name}» حذف شود؟`)) return;
    deleteCustomTemplate(value.id);
    setCustomTemplates(readCustomTemplates());
    onChange(asEditable(DEFAULT_TEMPLATE));
    setMessage('قالب سفارشی حذف شد.');
  };

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">۱. قالب ارزیابی</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            قالب را انتخاب، ویرایش یا از نو بسازید.
          </p>
        </div>
        <span className="chip shrink-0">گام ۱ از ۴</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
              <LayersIcon className="h-4 w-4 text-orange-500" />
              قالب‌ها
            </h3>
            <span className="text-[11px] text-slate-400">
              {faNumber(templates.length)} قالب
            </span>
          </div>

          <div className="max-h-[23rem] space-y-2 overflow-y-auto pl-1 xl:max-h-[32rem]">
            {templates.map((template) => {
              const active = template.id === value.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`w-full rounded-2xl border p-3 text-right transition ${
                    active
                      ? 'border-orange-400/70 bg-orange-50/80 shadow-sm dark:border-orange-400/40 dark:bg-orange-500/15'
                      : 'border-slate-200/80 bg-white/60 hover:border-orange-300/70 hover:bg-orange-50/40 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-orange-400/30 dark:hover:bg-white/[0.07]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                      {template.name}
                    </span>
                    {active ? (
                      <CheckIcon className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-300" />
                    ) : null}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span>{template.builtIn ? 'پیش‌فرض' : 'سفارشی'}</span>
                    <span>{faNumber(template.criteria.length)} معیار</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-dashed border-orange-300/70 bg-orange-50/40 p-3 dark:border-orange-400/25 dark:bg-orange-500/[0.07]">
            <label className="mb-1 block text-[11px] font-bold text-orange-900 dark:text-orange-100" htmlFor="new-template-name">
              قالب جدید
            </label>
            <div className="flex gap-2">
              <input
                id="new-template-name"
                className="field !rounded-xl !py-2 text-xs"
                value={newName}
                maxLength={120}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="نام قالب"
              />
              <button
                type="button"
                className="btn-primary shrink-0 !rounded-xl !px-3 !py-2"
                onClick={saveAsNew}
                title="ساخت قالب از نسخه‌ی فعلی"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <div>
              <label className="label" htmlFor="template-name">
                نام قالب
              </label>
              <input
                id="template-name"
                className={`field ${invalidName ? 'field-error' : ''}`}
                value={value.name}
                maxLength={120}
                onChange={(event) => update({ name: event.target.value })}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-2xl border border-orange-200/70 bg-orange-50/60 px-3 py-2.5 text-center dark:border-orange-400/25 dark:bg-orange-500/10">
                <span className="block text-[10px] text-orange-700/80 dark:text-orange-200/80">جمع وزن</span>
                <span className="text-base font-extrabold tabular-nums text-orange-700 dark:text-orange-200">
                  {faNumber(total, 1)}٪
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={distributeWeights}>
                توزیع یکسان وزن‌ها
              </button>
              <button type="button" className="btn-ghost !px-2 !py-1.5 text-xs" onClick={resetCurrent}>
                بازگرداندن
              </button>
            </div>
            <span className="chip-brand">
              <SparklesIcon className="h-3.5 w-3.5" />
              {faNumber(value.criteria.length)} معیار
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {value.criteria.map((criterion, index) => (
              <article
                key={criterion.key || index}
                className="rounded-2xl border border-slate-200/80 bg-white/60 p-3.5 backdrop-blur transition hover:border-orange-300/70 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-orange-400/30"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
                    معیار {faNumber(index + 1)}
                  </span>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    onClick={() => removeCriterion(index)}
                    aria-label={`حذف معیار ${index + 1}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <input
                    className="field !rounded-xl !py-2 text-sm"
                    value={criterion.name}
                    maxLength={120}
                    placeholder="نام معیار"
                    aria-label={`نام معیار ${index + 1}`}
                    onChange={(event) => updateCriterion(index, { name: event.target.value })}
                  />
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                    <label className="relative">
                      <input
                        type="number"
                        min={0.1}
                        max={100}
                        step={0.1}
                        className="field !rounded-xl !py-2 pl-7 text-center text-sm tabular-nums"
                        value={criterion.weight}
                        aria-label={`وزن معیار ${index + 1}`}
                        onChange={(event) =>
                          updateCriterion(index, { weight: Math.max(0, Number(event.target.value)) })
                        }
                      />
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                        ٪
                      </span>
                    </label>
                    <input
                      className="field !rounded-xl !py-2 text-xs"
                      value={criterion.description}
                      maxLength={300}
                      placeholder="توضیح کوتاه معیار"
                      aria-label={`توضیح معیار ${index + 1}`}
                      onChange={(event) => updateCriterion(index, { description: event.target.value })}
                    />
                  </div>
                </div>
              </article>
            ))}

            <button
              type="button"
              onClick={addCriterion}
              className="flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300/80 bg-orange-50/30 text-xs font-bold text-orange-700 transition hover:bg-orange-50/70 dark:border-orange-400/25 dark:bg-orange-500/[0.04] dark:text-orange-300 dark:hover:bg-orange-500/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500/10">
                <PlusIcon className="h-4 w-4" />
              </span>
              افزودن معیار
            </button>
          </div>

          {invalidName ? (
            <p className="flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
              <AlertIcon className="h-3.5 w-3.5" />
              نام قالب باید حداقل ۲ کاراکتر باشد.
            </p>
          ) : null}
          {emptyCriterion ? (
            <p className="flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
              <AlertIcon className="h-3.5 w-3.5" />
              نام همه‌ی معیارها را کامل کنید.
            </p>
          ) : null}
          {duplicate ? (
            <p className="flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
              <AlertIcon className="h-3.5 w-3.5" />
              نام معیارها نباید تکراری باشد.
            </p>
          ) : null}
          {invalidWeight ? (
            <p className="flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
              <AlertIcon className="h-3.5 w-3.5" />
              وزن هر معیار باید بزرگ‌تر از صفر باشد.
            </p>
          ) : null}

          <div className="rounded-2xl border border-orange-200/70 bg-orange-50/60 p-3.5 dark:border-orange-400/25 dark:bg-orange-500/10">
            <div className="flex flex-wrap items-center gap-2">
              {!value.builtIn ? (
                <button type="button" className="btn-primary !py-2 text-xs" onClick={saveCurrent}>
                  <SaveIcon className="h-4 w-4" />
                  ذخیره تغییرات
                </button>
              ) : null}
              <span className="flex items-center gap-1 text-[11px] text-orange-900/70 dark:text-orange-200/75">
                <EditIcon className="h-3.5 w-3.5" />
                {value.builtIn
                  ? 'برای نگه‌داشتن ویرایش، قالب را با نام جدید ذخیره کنید.'
                  : 'ویرایش‌ها روی همین قالب ذخیره می‌شوند.'}
              </span>
              {!value.builtIn ? (
                <button type="button" className="btn-danger mr-auto !py-2 text-xs" onClick={removeCustom}>
                  <TrashIcon className="h-3.5 w-3.5" />
                  حذف
                </button>
              ) : null}
            </div>
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
              disabled={!ready}
              onClick={() => {
                if (!ready) {
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
        </div>
      </div>
    </section>
  );
}


