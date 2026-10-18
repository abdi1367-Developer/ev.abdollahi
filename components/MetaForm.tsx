'use client';

import { DEGREES, type Degree, type ThesisMeta } from '@/lib/types';
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon } from './Icons';
import { PersianDatePicker } from './PersianDatePicker';

interface MetaFormProps {
  value: ThesisMeta;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (meta: ThesisMeta) => void;
  onSubmit: () => void;
  onBack?: () => void;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="mr-1 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300"
          role="alert"
        >
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function MetaForm({
  value,
  errors,
  disabled = false,
  onChange,
  onSubmit,
  onBack,
}: MetaFormProps) {
  const update = <K extends keyof ThesisMeta>(key: K, next: ThesisMeta[K]) => {
    onChange({ ...value, [key]: next });
  };

  const errorCount = Object.keys(errors).length;

  return (
    <form
      className="card space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">۲. مشخصات پایان‌نامه</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            فقط عنوان، نام دانشجو و شماره تماس الزامی است.
          </p>
        </div>
        <span className="chip shrink-0">گام ۲ از ۴</span>
      </div>

      {errorCount > 0 ? (
        <div className="alert-error" role="alert">
          {errorCount === 1
            ? 'یک فیلد نیاز به اصلاح دارد.'
            : `${errorCount.toLocaleString('fa-IR')} فیلد نیاز به اصلاح دارند.`}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="نام و نام خانوادگی دانشجو" htmlFor="studentName" required error={errors.studentName}>
          <input
            id="studentName"
            className={`field ${errors.studentName ? 'field-error' : ''}`}
            value={value.studentName}
            maxLength={120}
            autoComplete="name"
            disabled={disabled}
            placeholder="مثال: سارا احمدی"
            onChange={(event) => update('studentName', event.target.value)}
          />
        </Field>

        <Field label="شماره تماس" htmlFor="phone" required error={errors.phone}>
          <input
            id="phone"
            type="tel"
            className={`field ltr ${errors.phone ? 'field-error' : ''}`}
            value={value.phone}
            maxLength={25}
            inputMode="tel"
            autoComplete="tel"
            disabled={disabled}
            placeholder="0912 123 4567"
            onChange={(event) => update('phone', event.target.value)}
          />
        </Field>

        <Field label="شماره دانشجویی (اختیاری)" htmlFor="studentId" error={errors.studentId}>
          <input
            id="studentId"
            className={`field ltr ${errors.studentId ? 'field-error' : ''}`}
            value={value.studentId}
            maxLength={20}
            inputMode="numeric"
            disabled={disabled}
            placeholder="40123456"
            onChange={(event) => update('studentId', event.target.value)}
          />
        </Field>

        <Field
          label="عنوان پایان‌نامه"
          htmlFor="title"
          required
          error={errors.title}
          className="sm:col-span-2 lg:col-span-3"
        >
          <input
            id="title"
            className={`field ${errors.title ? 'field-error' : ''}`}
            value={value.title}
            maxLength={300}
            disabled={disabled}
            placeholder="مثال: تحلیل کارآمدی روش‌های یادگیری عمیق در پردازش زبان فارسی"
            onChange={(event) => update('title', event.target.value)}
          />
        </Field>

        <Field label="مقطع تحصیلی" htmlFor="degree" error={errors.degree}>
          <select
            id="degree"
            className={`field ${errors.degree ? 'field-error' : ''}`}
            value={value.degree}
            disabled={disabled}
            onChange={(event) => update('degree', event.target.value as Degree)}
          >
            {DEGREES.map((degree) => (
              <option key={degree} value={degree}>
                {degree}
              </option>
            ))}
          </select>
        </Field>

        <Field label="رشته تحصیلی (اختیاری)" htmlFor="field" error={errors.field}>
          <input
            id="field"
            className={`field ${errors.field ? 'field-error' : ''}`}
            value={value.field}
            maxLength={120}
            disabled={disabled}
            placeholder="مثال: مهندسی کامپیوتر — هوش مصنوعی"
            onChange={(event) => update('field', event.target.value)}
          />
        </Field>
        <Field label="دانشگاه / مؤسسه (اختیاری)" htmlFor="university" error={errors.university}>
          <input
            id="university"
            className={`field ${errors.university ? 'field-error' : ''}`}
            value={value.university}
            maxLength={160}
            disabled={disabled}
            placeholder="مثال: دانشگاه شهید بهشتی"
            onChange={(event) => update('university', event.target.value)}
          />
        </Field>

        <Field label="استاد راهنما (اختیاری)" htmlFor="supervisor" error={errors.supervisor}>
          <input
            id="supervisor"
            className={`field ${errors.supervisor ? 'field-error' : ''}`}
            value={value.supervisor}
            maxLength={120}
            disabled={disabled}
            placeholder="دکتر …"
            onChange={(event) => update('supervisor', event.target.value)}
          />
        </Field>

        <Field label="استاد مشاور (اختیاری)" htmlFor="advisor" error={errors.advisor}>
          <input
            id="advisor"
            className={`field ${errors.advisor ? 'field-error' : ''}`}
            value={value.advisor}
            maxLength={120}
            disabled={disabled}
            placeholder="دکتر …"
            onChange={(event) => update('advisor', event.target.value)}
          />
        </Field>

        <Field
          label="تاریخ دفاع (اختیاری)"
          htmlFor="defenseDate"
          error={errors.defenseDate}
        >
          <PersianDatePicker
            id="defenseDate"
            value={value.defenseDate}
            disabled={disabled}
            invalid={Boolean(errors.defenseDate)}
            onChange={(next) => update('defenseDate', next)}
          />
        </Field>

        <Field
          label="نکات برای ارزیاب (اختیاری)"
          htmlFor="description"
          error={errors.description}
          className="sm:col-span-2 lg:col-span-3"
        >
          <textarea
            id="description"
            className={`field min-h-[92px] resize-y leading-7 ${errors.description ? 'field-error' : ''}`}
            value={value.description}
            maxLength={2000}
            disabled={disabled}
            placeholder="هر نکته‌ای که می‌خواهید در ارزیابی لحاظ شود…"
            onChange={(event) => update('description', event.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={disabled}>
          <ArrowRightIcon className="h-4 w-4" />
          بازگشت به قالب
        </button>
        <button type="submit" className="btn-primary" disabled={disabled}>
          ادامه و بارگذاری فایل
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
