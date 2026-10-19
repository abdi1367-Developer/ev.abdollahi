'use client';

import { useCallback, useEffect, useState } from 'react';
import { readJsonSafe } from '@/lib/api';
import { START_EVALUATION_EVENT } from '@/lib/evaluation-events';
import { saveLocalRecord } from '@/lib/local-store';
import { capMarkdown } from '@/lib/record';
import {
  DEFAULT_TEMPLATE,
  cloneCriteria,
  toTemplateSnapshot,
  type EvaluationTemplate,
} from '@/lib/templates';
import { readSelectedTemplate, writeSelectedTemplate } from '@/lib/template-store';
import { EMPTY_META, createRecordId, validateThesisMeta } from '@/lib/validation';
import type {
  AnalyzeResponse,
  ConvertInfo,
  ConvertResponse,
  EvaluationRecord,
  SaveHistoryResponse,
  ThesisMeta,
} from '@/lib/types';
import { AnalyzePanel } from './AnalyzePanel';
import { CheckIcon } from './Icons';
import { FileUploader } from './FileUploader';
import { MetaForm } from './MetaForm';
import { EvaluationReportView } from './EvaluationReportView';
import { TemplateWorkbench } from './TemplateWorkbench';

type Step = 'template' | 'meta' | 'file' | 'analyze' | 'report';

const STEP_ITEMS: { key: Step; label: string }[] = [
  { key: 'template', label: 'قالب ارزیابی' },
  { key: 'meta', label: 'مشخصات' },
  { key: 'file', label: 'فایل و متن' },
  { key: 'analyze', label: 'تحلیل هوشمند' },
];

export function Wizard() {
  const [step, setStep] = useState<Step>('template');
  const [template, setTemplate] = useState<EvaluationTemplate>(() => ({
    ...DEFAULT_TEMPLATE,
    criteria: cloneCriteria(DEFAULT_TEMPLATE.criteria),
  }));
  const [meta, setMeta] = useState<ThesisMeta>(EMPTY_META);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [markdown, setMarkdown] = useState('');
  const [convertInfo, setConvertInfo] = useState<ConvertInfo | null>(null);

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [instructions, setInstructions] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [recordId, setRecordId] = useState('');
  const [storageBackend, setStorageBackend] = useState<'kv' | 'local' | null>(null);
  // هر بار که «ارزیابی جدید» زده می‌شود یک شمارنده افزایش می‌یابد تا اسکرول
  // دقیقاً بعد از رندر شدن مرحله‌ی قالب اجرا شود.
  const [resetCount, setResetCount] = useState(0);

  // انتخاب قالب ذخیره‌شده فقط پس از mount خوانده می‌شود تا رندر سرور و کلاینت یکسان بماند.
  useEffect(() => {
    const saved = readSelectedTemplate();
    setTemplate({ ...saved, criteria: cloneCriteria(saved.criteria) });
  }, []);

  const submitMeta = () => {
    const validation = validateThesisMeta(meta);
    setErrors(validation.errors);
    setMeta(validation.meta);
    if (Object.keys(validation.errors).length === 0) {
      setStep('file');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleConverted = (payload: ConvertResponse) => {
    setMarkdown(payload.markdown);
    setConvertInfo(payload.info);
    // با تغییر فایل، گزارش قبلی معتبر نیست
    setResult(null);
    setInstructions('');
    setCreatedAt('');
    setRecordId('');
  };

  const persistRecord = async (record: EvaluationRecord) => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const payload = await readJsonSafe<SaveHistoryResponse>(response);
      if (response.ok && payload?.stored) {
        setStorageBackend('kv');
        return;
      }
    } catch {
      // در صورت خطا، ذخیره‌سازی محلی انجام می‌شود
    }

    const saved = saveLocalRecord(record);
    setStorageBackend(saved ? 'local' : null);
  };

  const handleAnalyzed = (response: AnalyzeResponse, userInstructions: string) => {
    if (!convertInfo) return;

    const now = new Date().toISOString();
    const id = createRecordId();
    const snapshot = response.template ?? toTemplateSnapshot(template);

    setResult(response);
    setCreatedAt(now);
    setRecordId(id);
    setInstructions(userInstructions);
    setStep('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const record: EvaluationRecord = {
      id,
      createdAt: now,
      meta,
      markdown: capMarkdown(markdown),
      convert: convertInfo,
      report: response.report,
      analysis: response.analysis,
      instructions: userInstructions || undefined,
      template: snapshot,
      mode: response.report.mode ?? response.mode,
    };

    void persistRecord(record);
  };

  const resetAll = useCallback(() => {
    setStep('template');
    setErrors({});
    setMarkdown('');
    setConvertInfo(null);
    setResult(null);
    setInstructions('');
    setCreatedAt('');
    setRecordId('');
    setStorageBackend(null);
    setResetCount((value) => value + 1);
  }, []);

  // دکمه‌ی «شروع ارزیابی» در بنر صفحه‌ی اصلی (و هر دکمه‌ی بیرون از ویزارد)
  // با این رویداد، ویزارد را به مرحله‌ی اول برمی‌گرداند.
  useEffect(() => {
    const handleStartEvaluation = () => resetAll();
    window.addEventListener(START_EVALUATION_EVENT, handleStartEvaluation);
    return () => window.removeEventListener(START_EVALUATION_EVENT, handleStartEvaluation);
  }, [resetAll]);

  // اسکرول باید بعد از رندر شدن مرحله‌ی قالب انجام شود؛ وگرنه صفحه‌ی بلندِ
  // گزارش هنوز در DOM است و مرورگر ممکن است در پایین صفحه بماند.
  useEffect(() => {
    if (resetCount === 0) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('evaluation');
      if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
      else window.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [resetCount]);

  const activeIndex = step === 'report' ? STEP_ITEMS.length : STEP_ITEMS.findIndex((item) => item.key === step);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs sm:gap-3">
        {STEP_ITEMS.map((item, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex && step !== 'report';
          return (
            <li
              key={item.key}
              className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur transition ${
                active
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400'
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-white/15 dark:text-slate-200'
                }`}
              >
                {done ? <CheckIcon className="h-3 w-3" /> : (index + 1).toLocaleString('fa-IR')}
              </span>
              <span className="font-semibold">{item.label}</span>
            </li>
          );
        })}
      </ol>

      {step === 'template' ? (
        <TemplateWorkbench
          value={template}
          onChange={(next) => {
            setTemplate(next);
            writeSelectedTemplate(next.id);
          }}
          onNext={() => {
            writeSelectedTemplate(template.id);
            setStep('meta');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : null}

      {step === 'meta' ? (
        <MetaForm
          value={meta}
          errors={errors}
          onChange={(next) => {
            setMeta(next);
            if (Object.keys(errors).length) setErrors({});
          }}
          onSubmit={submitMeta}
          onBack={() => setStep('template')}
        />
      ) : null}

      {step === 'file' ? (
        <FileUploader
          meta={meta}
          markdown={markdown}
          convertInfo={convertInfo}
          onConverted={handleConverted}
          onContinue={() => {
            if (!markdown) return;
            setStep('analyze');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBack={() => setStep('meta')}
        />
      ) : null}

      {step === 'analyze' && convertInfo ? (
        <AnalyzePanel
          meta={meta}
          markdown={markdown}
          convertInfo={convertInfo}
          criteria={template.criteria}
          templateId={template.id}
          templateName={template.name}
          onBack={() => setStep('file')}
          onCompleted={handleAnalyzed}
        />
      ) : null}

      {step === 'report' && result ? (
        <EvaluationReportView
          meta={meta}
          report={result.report}
          analysis={result.analysis}
          convert={convertInfo ?? undefined}
          createdAt={createdAt}
          storageBackend={storageBackend}
          instructions={instructions}
          mode={result.report.mode ?? result.mode}
          templateName={result.template?.name ?? template.name}
          onNewEvaluation={resetAll}
        />
      ) : null}

      {recordId ? (
        <p className="text-center text-[11px] text-slate-400">
          شناسه‌ی این ارزیابی: <span className="ltr inline-block">{recordId}</span>
        </p>
      ) : null}
    </div>
  );
}
