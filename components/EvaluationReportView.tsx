'use client';

import { useMemo, useState } from 'react';
import { copyToClipboard, downloadJson, downloadMarkdown } from '@/lib/download';
import { buildDownloadName, faNumber, formatFaDate } from '@/lib/format';
import { reportToJsonObject, polishReport, reportToMarkdown } from '@/lib/report';
import { ensureReportBullets } from '@/lib/bullets';
import { formatJalaliIso } from '@/lib/jalali';
import { findEvaluationMode } from '@/lib/evaluation-mode';
import { scoreTone } from '@/lib/ui';
import type {
  AnalysisInfo,
  ConvertInfo,
  CriterionResult,
  EvaluationMode,
  EvaluationReport,
  ThesisMeta,
} from '@/lib/types';
import {
  ArrowRightIcon,
  ChartIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  PrintIcon,
  ShieldIcon,
  TargetIcon,
  TrendingUpIcon,
} from './Icons';
import { ScoreRing } from './ScoreRing';
import { DonutChart, RadarChart, ScoreBars } from './Charts';

export interface ReportViewProps {
  meta: ThesisMeta;
  report: EvaluationReport;
  analysis: AnalysisInfo;
  convert?: ConvertInfo;
  createdAt?: string;
  storageBackend?: 'kv' | 'local' | null;
  instructions?: string;
  templateName?: string;
  /** حالت (نوع) ارزیابی؛ اگر خالی باشد از خود گزارش خوانده می‌شود */
  mode?: EvaluationMode;
  onNewEvaluation?: () => void;
}

const SEGMENT_COLORS = [
  '#ea580c',
  '#f97316',
  '#fb923c',
  '#f59e0b',
  '#fbbf24',
  '#d97706',
  '#c2410c',
  '#fdba74',
  '#92400e',
  '#fcd34d',
];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function EvaluationReportView({
  meta,
  report: rawReport,
  analysis,
  convert,
  createdAt,
  storageBackend,
  instructions,
  templateName,
  mode,
  onNewEvaluation,
}: ReportViewProps) {
  const [copied, setCopied] = useState(false);
  // گزارش‌های قدیمی ذخیره‌شده هم حداقل ۵ نقطه قوت/ضعف برای هر معیار نمایش می‌دهند
  const report = useMemo(() => ensureReportBullets(polishReport(rawReport)), [rawReport]);

  // حالت ارزیابی: اولویت با مقدار ثبت‌شده در خود گزارش است
  const appliedMode = report.mode ?? mode;
  const modeDefinition = appliedMode ? findEvaluationMode(appliedMode) : null;

  const exportInput = useMemo(
    () => ({
      meta,
      report,
      analysis,
      convert,
      createdAt,
      instructions,
      mode: appliedMode,
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
    [meta, report, analysis, convert, createdAt, instructions, templateName, appliedMode],
  );

  const markdownReport = useMemo(() => reportToMarkdown(exportInput), [exportInput]);
  const jsonReport = useMemo(() => reportToJsonObject(exportInput), [exportInput]);
  const totalWeight =
    report.criteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0) || 1;

  const scoreData = report.criteria.map((criterion) => ({
    label: criterion.name,
    value: clampScore(criterion.score),
  }));
  const weightSegments = report.criteria.map((criterion, index) => ({
    label: criterion.name,
    value: Math.max(0, Number(criterion.weight) || 0),
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
  }));
  const contributionSegments = report.criteria.map((criterion, index) => ({
    label: criterion.name,
    value: (clampScore(criterion.score) * Math.max(0, Number(criterion.weight) || 0)) / totalWeight,
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
  }));
  const strongest = [...report.criteria].sort((a, b) => b.score - a.score)[0];
  const weakest = [...report.criteria].sort((a, b) => a.score - b.score)[0];

  const handlePrint = () => {
    const reportNode = document.getElementById('evaluation-report');
    if (!reportNode) {
      window.print();
      return;
    }

    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        switch (character) {
          case '&':
            return '&amp;';
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '"':
            return '&quot;';
          default:
            return '&#39;';
        }
      });

    const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    const baseHref = escapeHtml(document.baseURI);
    const printTitle = escapeHtml(meta.title ? `گزارش ارزیابی — ${meta.title}` : 'گزارش ارزیابی');

    const printDocument = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base href="${baseHref}" />
<title>${printTitle}</title>
${styleSheets}
<style>
  @page { size: A4 landscape; margin: 10mm; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; }
  body { font-family: Vazirmatn, IRANSansX, IRANSans, Tahoma, 'Segoe UI', system-ui, sans-serif; }
  #evaluation-report { width: 100% !important; margin: 0 !important; padding: 0 !important; }
  #evaluation-report button { display: none !important; }
  #evaluation-report .card,
  #evaluation-report article,
  #evaluation-report li,
  #evaluation-report svg,
  #evaluation-report table { break-inside: avoid; page-break-inside: avoid; }
  #evaluation-report .card,
  #evaluation-report > section { background: #fff !important; box-shadow: none !important; backdrop-filter: none !important; }
  #evaluation-report h1,
  #evaluation-report h2,
  #evaluation-report h3 { break-after: avoid; page-break-after: avoid; }
  #evaluation-report,
  #evaluation-report * { animation: none !important; transition: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #evaluation-report .chart-reveal { opacity: 1 !important; transform: none !important; }
</style>
</head>
<body>${reportNode.outerHTML}</body>
</html>`;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('title', 'نسخه‌ی چاپ گزارش');
    frame.style.cssText =
      'position:fixed;top:0;left:-12000px;width:1200px;height:900px;border:0;background:#fff;';
    frame.srcdoc = printDocument;

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      frame.remove();
    };

    frame.onload = () => {
      const printWindow = frame.contentWindow;
      const printDoc = frame.contentDocument;
      if (!printWindow || !printDoc) {
        cleanup();
        window.print();
        return;
      }

      printDoc.querySelectorAll('details').forEach((element) => {
        element.open = true;
      });

      const triggerPrint = () => {
        printWindow.addEventListener('afterprint', cleanup, { once: true });
        printWindow.focus();
        printWindow.print();
        window.setTimeout(cleanup, 300000);
      };

      const fontsReady = printDoc.fonts?.ready ?? Promise.resolve();
      void fontsReady
        .catch(() => undefined)
        .then(() => window.setTimeout(triggerPrint, 150));
    };

    document.body.appendChild(frame);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(markdownReport);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div id="evaluation-report" className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/60 p-5 shadow-glass backdrop-blur-2xl sm:p-7 dark:border-white/10 dark:bg-white/[0.05]">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <ScoreRing score={report.overall_score} />

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip-brand">
                <FileTextIcon className="h-3.5 w-3.5" />
                گزارش ارزیابی
              </span>
              {templateName ? (
                <span className="chip">
                  <LayersIcon className="h-3.5 w-3.5" />
                  {templateName}
                </span>
              ) : null}
              {modeDefinition ? (
                <span className={modeDefinition.chipClass}>
                  <TargetIcon className="h-3.5 w-3.5" />
                  ارزیابی {modeDefinition.label}
                </span>
              ) : null}
              {meta.degree ? <span className="chip">{meta.degree}</span> : null}
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
                {[meta.studentName, meta.university, meta.supervisor ? `استاد راهنما: ${meta.supervisor}` : '']
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            </div>

            <p className="text-[13px] leading-7 text-slate-600 dark:text-slate-300">{report.summary}</p>

            {modeDefinition ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-6 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  نوع ارزیابی: {modeDefinition.label}
                </span>
                {' — '}
                {modeDefinition.description} بازه‌ی معمول نمره در این حالت {modeDefinition.expectedRange} از ۱۰۰ است.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !py-2 text-xs"
                onClick={() => downloadMarkdown(markdownReport, buildDownloadName(meta, 'evaluation', 'md'))}
              >
                <DownloadIcon className="h-4 w-4" />
                دانلود Markdown
              </button>
              <button
                type="button"
                className="btn-secondary !py-2 text-xs"
                onClick={() => downloadJson(jsonReport, buildDownloadName(meta, 'evaluation', 'json'))}
              >
                <DownloadIcon className="h-4 w-4" />
                JSON
              </button>
              <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void handleCopy()}>
                {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <CopyIcon className="h-4 w-4" />}
                {copied ? 'کپی شد' : 'کپی گزارش'}
              </button>
              <button
                type="button"
                className="btn-secondary !py-2 text-xs"
                onClick={handlePrint}
                title="چاپ افقی گزارش همراه با نمودارها"
              >
                <PrintIcon className="h-4 w-4" />
                پرینت گزارش
              </button>
              {onNewEvaluation ? (
                <button
                  type="button"
                  className="btn-secondary !py-2 text-xs"
                  onClick={onNewEvaluation}
                >
                  <ArrowRightIcon className="h-4 w-4" />
                  ارزیابی جدید
                </button>
              ) : null}
              {storageBackend ? (
                <span className="inline-flex items-center gap-1 rounded-xl bg-slate-900/5 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  {storageBackend === 'kv' ? 'ذخیره در Vercel' : 'ذخیره در مرورگر'}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'قوی‌ترین معیار', value: strongest?.name ?? '—', icon: TrendingUpIcon, tone: 'text-emerald-600' },
          { label: 'ضعیف‌ترین معیار', value: weakest?.name ?? '—', icon: TargetIcon, tone: 'text-rose-500' },
          { label: 'تعداد معیارها', value: faNumber(report.criteria.length), icon: ChartIcon, tone: 'text-orange-600' },
          { label: 'جمع وزن‌ها', value: `${faNumber(totalWeight, 1)}٪`, icon: LayersIcon, tone: 'text-amber-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card flex items-center gap-3 !p-3.5 sm:!p-4">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900/5 dark:bg-white/10 ${stat.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold text-slate-400">{stat.label}</span>
                <span className="block truncate text-xs font-extrabold text-slate-900 sm:text-sm dark:text-white">
                  {stat.value}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <TargetIcon className="h-4 w-4 text-orange-500" />
            نقشه‌ی نمره‌ی معیارها
          </h2>
          <RadarChart data={scoreData} size={350} />
        </div>

        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <ChartIcon className="h-4 w-4 text-orange-500" />
            سهم معیارها در نمره
          </h2>
          <DonutChart
            segments={contributionSegments}
            centerValue={faNumber(report.overall_score, 1)}
            centerLabel="نمره کل"
            size={172}
          />
          <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto pl-1">
            {contributionSegments.map((segment) => (
              <li
                key={segment.label}
                className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-300"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate">{segment.label}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">{faNumber(segment.value, 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <TrendingUpIcon className="h-4 w-4 text-orange-500" />
            نمره‌ی هر معیار
          </h2>
          <ScoreBars data={scoreData} />
        </div>

        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <LayersIcon className="h-4 w-4 text-orange-500" />
            وزن معیارها
          </h2>
          <DonutChart
            segments={weightSegments}
            centerValue={`${faNumber(totalWeight, 1)}٪`}
            centerLabel="جمع وزن"
            size={172}
          />
          <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto pl-1">
            {weightSegments.map((segment) => (
              <li
                key={segment.label}
                className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-300"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate">{segment.label}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">{faNumber(segment.value, 1)}٪</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {report.top_recommendations.length ? (
        <section className="card">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <TrendingUpIcon className="h-4 w-4 text-orange-500" />
            پیشنهادهای اولویت‌دار
          </h2>
          <ol className="mt-3 grid gap-2 lg:grid-cols-2">
            {report.top_recommendations.map((item, index) => (
              <li key={`rec-${index}`} className="flex gap-2 rounded-2xl bg-orange-50/60 p-3 text-[12px] leading-6 text-orange-950 dark:bg-orange-500/10 dark:text-orange-100">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {faNumber(index + 1)}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <FileTextIcon className="h-4 w-4 text-orange-500" />
          ارزیابی تفصیلی
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.criteria.map((criterion, index) => (
            <CriterionCard key={`${criterion.name}-${index}`} criterion={criterion} index={index} totalWeight={totalWeight} />
          ))}
        </div>
      </section>

      <details className="card">
        <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100">
          جزئیات فایل و تحلیل
        </summary>
        <div className="mt-4 grid gap-3 text-xs leading-6 text-slate-600 sm:grid-cols-2 lg:grid-cols-4 dark:text-slate-300">
          <div>
            <span className="block text-[10px] text-slate-400">مدل</span>
            <span dir="ltr" className="ltr inline-block font-semibold">{analysis.model}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400">زمان تحلیل</span>
            <span className="font-semibold">{faNumber(Math.round(analysis.durationMs / 1000))} ثانیه</span>
          </div>
          {convert ? (
            <div>
              <span className="block text-[10px] text-slate-400">فایل</span>
              <span className="font-semibold">{convert.fileName}</span>
            </div>
          ) : null}
          {convert ? (
            <div>
              <span className="block text-[10px] text-slate-400">حجم متن</span>
              <span className="font-semibold">{faNumber(convert.words)} واژه</span>
            </div>
          ) : null}
          {meta.defenseDate ? (
            <div>
              <span className="block text-[10px] text-slate-400">تاریخ دفاع</span>
              <span className="font-semibold">{formatJalaliIso(meta.defenseDate)}</span>
            </div>
          ) : null}
        </div>
        {instructions ? (
          <p className="mt-3 rounded-xl bg-slate-900/5 p-3 text-[11px] leading-6 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <span className="font-bold">دستور تحلیل: </span>
            {instructions}
          </p>
        ) : null}
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {onNewEvaluation ? (
          <button type="button" className="btn-secondary" onClick={onNewEvaluation}>
            <ArrowRightIcon className="h-4 w-4" />
            ارزیابی جدید
          </button>
        ) : <span />}
        <p className="text-[10px] text-slate-400">گزارش هوش مصنوعی جایگزین داوری رسمی نیست.</p>
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
  const contribution = (score * Math.max(0, Number(criterion.weight) || 0)) / totalWeight;

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
          <span className="text-slate-400">{faNumber(index + 1)}.</span>
          <span>{criterion.name}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">وزن {faNumber(criterion.weight)}٪</span>
          <span className="chip">سهم {faNumber(contribution, 1)}</span>
          <span className={`text-sm font-extrabold tabular-nums ${tone.text}`}>{faNumber(score, 1)}</span>
        </div>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`نمره‌ی ${criterion.name}`}
      >
        <div
          className={`chart-bar h-full animate-bar-grow rounded-full ${tone.bar}`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>

      <p className="mt-2.5 text-[12px] leading-6 text-slate-600 dark:text-slate-300">{criterion.reasoning}</p>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
          <p className="mb-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">نقاط قوت</p>
          {criterion.strengths.length ? (
            <ul className="list-disc space-y-0.5 pr-4 text-[11px] leading-5 text-emerald-900 dark:text-emerald-100">
              {criterion.strengths.map((item, itemIndex) => (
                <li key={`s-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-emerald-800/70 dark:text-emerald-200/70">—</p>
          )}
        </div>

        <div className="rounded-xl bg-rose-50 p-2.5 dark:bg-rose-500/10">
          <p className="mb-1 text-[11px] font-bold text-rose-800 dark:text-rose-200">نقاط قابل بهبود</p>
          {criterion.weaknesses.length ? (
            <ul className="list-disc space-y-0.5 pr-4 text-[11px] leading-5 text-rose-900 dark:text-rose-100">
              {criterion.weaknesses.map((item, itemIndex) => (
                <li key={`w-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-rose-800/70 dark:text-rose-200/70">—</p>
          )}
        </div>
      </div>
    </article>
  );
}


