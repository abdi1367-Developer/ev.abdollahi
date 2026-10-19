'use client';

import { useMemo, useState } from 'react';
import { copyToClipboard, downloadJson, downloadMarkdown } from '@/lib/download';
import { buildDownloadName, faNumber, formatFaDate } from '@/lib/format';
import { ensureReportBullets } from '@/lib/bullets';
import { reportToJsonObject, polishReport, reportToMarkdown } from '@/lib/report';
import { scoreTone } from '@/lib/ui';
import type {
  AnalysisInfo,
  ConvertInfo,
  CriterionResult,
  EvaluationReport,
  ThesisMeta,
} from '@/lib/types';
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  FileTextIcon,
  LayersIcon,
  MarkdownIcon,
  ShieldIcon,
} from './Icons';
import { ScoreRing } from './ScoreRing';

export interface ReportViewProps {
  meta: ThesisMeta;
  report: EvaluationReport;
  analysis: AnalysisInfo;
  convert?: ConvertInfo;
  createdAt?: string;
  storageBackend?: 'kv' | 'local' | null;
  /** دستور تحلیل اختصاصی کاربر (در صورت وجود، در گزارش نمایش داده می‌شود) */
  instructions?: string;
  /** نام قالب ارزیابی استفاده‌شده */
  templateName?: string;
  onNewEvaluation?: () => void;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function ReportView({
  meta,
  report: rawReport,
  analysis,
  convert,
  createdAt,
  storageBackend,
  instructions,
  templateName,
  onNewEvaluation,
}: ReportViewProps) {
  const [copied, setCopied] = useState(false);
  // گزارش‌های قدیمی ذخیره‌شده هم حداقل ۵ نقطه قوت/ضعف برای هر معیار نمایش می‌دهند
  const report = useMemo(() => ensureReportBullets(polishReport(rawReport)), [rawReport]);

  const exportInput = useMemo(
    () => ({
      meta,
      report,
      analysis,
      convert,
      createdAt,
      instructions,
      template: templateName
        ? {
            id: 'report-template',
            name: templateName,
            criteria: report.criteria.map((criterion) => ({
              name: criterion.name,
              weight: criterion.weight,
            })),
          }
        : undefined,
    }),
    [meta, report, analysis, convert, createdAt, instructions, templateName],
  );
  const markdownReport = useMemo(() => reportToMarkdown(exportInput), [exportInput]);
  const jsonReport = useMemo(() => reportToJsonObject(exportInput), [exportInput]);
  const totalWeight =
    report.criteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0) || 1;

  const handleCopy = async () => {
    const ok = await copyToClipboard(markdownReport);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-5">
      <section className="card animate-fade-in">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreRing score={report.overall_score} />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-indigo-200 bg-indigo-50 text-indigo-700">
                <FileTextIcon className="h-3.5 w-3.5" />
                گزارش هوش مصنوعی
              </span>
              {templateName ? (
                <span className="chip">
                  <LayersIcon className="h-3.5 w-3.5" />
                  {templateName}
                </span>
              ) : null}
              {meta.degree ? <span className="chip">{meta.degree}</span> : null}
              {meta.field ? <span className="chip">{meta.field}</span> : null}
              {createdAt ? (
                <span className="chip">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {formatFaDate(createdAt)}
                </span>
              ) : null}
            </div>

            <div>
              <h1 className="text-lg font-extrabold leading-8 text-slate-900 sm:text-xl dark:text-white">
                {meta.title}
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {[
                  meta.studentName,
                  meta.studentId ? `شماره دانشجویی ${meta.studentId}` : '',
                  meta.university,
                ]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[
                  meta.supervisor ? `استاد راهنما: ${meta.supervisor}` : '',
                  meta.advisor ? `استاد مشاور: ${meta.advisor}` : '',
                  meta.phone ? `شماره تماس: ${meta.phone}` : '',
                ]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            </div>

            <p className="rounded-xl bg-slate-50 p-3 text-sm leading-7 text-slate-700 dark:bg-white/[0.05] dark:text-slate-200">
              {report.summary}
            </p>

            {instructions && instructions.trim() ? (
              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-3 dark:border-indigo-400/25 dark:bg-indigo-500/10">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 dark:text-indigo-200">
                  <EditIcon className="h-3.5 w-3.5" />
                  دستور تحلیل کاربر
                </p>
                <p className="mt-1 whitespace-pre-line text-[13px] leading-7 text-indigo-900 dark:text-indigo-100">
                  {instructions.trim()}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  downloadMarkdown(markdownReport, buildDownloadName(meta, 'گزارش-ارزیابی', 'md'))
                }
              >
                <DownloadIcon className="h-4 w-4" />
                دانلود گزارش (Markdown)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => downloadJson(jsonReport, buildDownloadName(meta, 'گزارش-ارزیابی', 'json'))}
              >
                <MarkdownIcon className="h-4 w-4" />
                دانلود JSON
              </button>
              <button type="button" className="btn-secondary" onClick={() => void handleCopy()}>
                {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <CopyIcon className="h-4 w-4" />}
                {copied ? 'کپی شد' : 'کپی گزارش'}
              </button>
            </div>
          </div>
        </div>

        {storageBackend ? (
          <p
            className={`mt-4 rounded-xl px-3 py-2 text-xs leading-6 ${
              storageBackend === 'kv'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-900'
            }`}
          >
            {storageBackend === 'kv'
              ? 'این ارزیابی در سرویس سوابق (KV) ذخیره شد و در همه‌ی دستگاه‌ها قابل مشاهده است.'
              : 'این ارزیابی در حافظه‌ی همین مرورگر ذخیره شد. برای ذخیره‌سازی دائمی و چنددستگاهی، KV را در تنظیمات محیطی فعال کنید.'}
          </p>
        ) : null}
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">ارزیابی تفصیلی معیارها</h2>
          <span className="chip">{faNumber(report.criteria.length)} معیار وزنی</span>
        </div>

        <div className="space-y-3">
          {report.criteria.map((criterion, index) => (
            <CriterionCard
              key={`${criterion.name}-${index}`}
              criterion={criterion}
              index={index}
              totalWeight={totalWeight}
            />
          ))}
        </div>
      </section>

      {report.top_recommendations.length ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold text-slate-900">پیشنهادهای اولویت‌دار برای اصلاح</h2>
          <ol className="space-y-2">
            {report.top_recommendations.map((item, index) => (
              <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-3 rounded-xl bg-indigo-50/70 p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {faNumber(index + 1)}
                </span>
                <span className="text-sm leading-7 text-slate-800">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">شفافیت فرایند تحلیل</h2>
        </div>

        {analysis.fallbackUsed && analysis.provider === 'openrouter' ? (
          <div className="alert-warning">
            مدل اصلی (DeepSeek) در این نوبت پاسخ معتبر نداد؛ ارزیابی با مدل جایگزین رایگان OpenRouter
            انجام شد.
          </div>
        ) : null}

        {analysis.fallbackUsed && analysis.provider === 'deepseek' ? (
          <div className="alert-warning">
            DeepSeek در تلاش اول پاسخ معتبر نداد؛ ارزیابی در تلاش بعدی تکمیل شد. نتیجه را یک‌بار
            بازبینی کنید.
          </div>
        ) : null}

        {analysis.truncated ? (
          <div className="alert-info">
            متن پایان‌نامه بلندتر از سقف ورودی مدل بود؛ بخش‌هایی از ابتدا، انتها و میانه‌ی متن به‌همراه فهرست
            سرفصل‌ها برای ارزیابی ارسال شد.
          </div>
        ) : null}

        <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">مدل</dt>
            <dd className="mt-0.5 break-words font-bold text-slate-800" dir="ltr">
              {analysis.model}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">سرویس‌دهنده</dt>
            <dd className="mt-0.5 font-bold text-slate-800">
              {analysis.provider === 'openrouter'
                ? 'OpenRouter (رایگان)'
                : analysis.provider === 'deepseek'
                  ? 'DeepSeek'
                  : analysis.provider}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">زمان تحلیل</dt>
            <dd className="mt-0.5 font-bold text-slate-800">
              {faNumber(Math.max(1, Math.round(analysis.durationMs / 1000)))} ثانیه
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">طول متن ارسالی</dt>
            <dd className="mt-0.5 font-bold text-slate-800">{faNumber(analysis.inputChars)} کاراکتر</dd>
          </div>
        </dl>

        <details className="rounded-xl border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            تلاش‌های مدل‌ها ({faNumber(analysis.attempts.length)})
          </summary>
          <ul className="mt-2 space-y-1.5 text-xs">
            {analysis.attempts.map((attempt, index) => (
              <li
                key={`${attempt.model}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${attempt.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                  <span dir="ltr">{attempt.model}</span>
                  <span className="text-slate-400">({attempt.provider})</span>
                </span>
                <span className={attempt.ok ? 'text-emerald-700' : 'text-rose-700'}>
                  {attempt.ok ? 'موفق' : attempt.error ?? `ناموفق${attempt.status ? ` (${attempt.status})` : ''}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-secondary" onClick={onNewEvaluation}>
          <ArrowRightIcon className="h-4 w-4" />
          ارزیابی جدید
        </button>
        <p className="text-xs leading-6 text-slate-500">
          این گزارش با کمک هوش مصنوعی تهیه شده و جایگزین داوری رسمی انسانی نیست.
        </p>
      </div>
    </div>
  );
}

interface CriterionCardProps {
  criterion: CriterionResult;
  index: number;
  totalWeight: number;
}

function CriterionCard({ criterion, index, totalWeight }: CriterionCardProps) {
  const score = clampScore(criterion.score);
  const tone = scoreTone(score);
  const contribution =
    (score * clampScore(criterion.weight)) / (Number.isFinite(totalWeight) && totalWeight > 0 ? totalWeight : 100);

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <span className="text-slate-400">{faNumber(index + 1)}.</span>
          <span>{criterion.name}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">وزن {faNumber(criterion.weight)}٪</span>
          <span className="chip">سهم در نمره: {faNumber(contribution, 1)}</span>
          <span className={`text-sm font-extrabold tabular-nums ${tone.text}`}>
            {faNumber(score, 1)}
            <span className="mr-1 text-[11px] font-medium text-slate-400">/ ۱۰۰</span>
          </span>
        </div>
      </div>

      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`نمره‌ی ${criterion.name}`}
      >
        <div
          className={`h-full rounded-full ${tone.bar} transition-[width] duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="mt-3 text-[13px] leading-7 text-slate-600">{criterion.reasoning}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="mb-1 text-xs font-bold text-emerald-800">نقاط قوت</p>
          {criterion.strengths.length ? (
            <ul className="list-disc space-y-1 pr-4 text-[13px] leading-6 text-emerald-900">
              {criterion.strengths.map((item, itemIndex) => (
                <li key={`s-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-emerald-800/70">مورد برجسته‌ای ذکر نشده است.</p>
          )}
        </div>

        <div className="rounded-xl bg-rose-50 p-3">
          <p className="mb-1 text-xs font-bold text-rose-800">نقاط قابل بهبود</p>
          {criterion.weaknesses.length ? (
            <ul className="list-disc space-y-1 pr-4 text-[13px] leading-6 text-rose-900">
              {criterion.weaknesses.map((item, itemIndex) => (
                <li key={`w-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-rose-800/70">مورد برجسته‌ای ذکر نشده است.</p>
          )}
        </div>
      </div>
    </article>
  );
}
