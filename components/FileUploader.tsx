'use client';

import { useRef, useState } from 'react';
import { getApiError, readJsonSafe } from '@/lib/api';
import { downloadMarkdown } from '@/lib/download';
import { buildDownloadName, faNumber, formatBytes } from '@/lib/format';
import type { ApiErrorResponse, ConvertInfo, ConvertResponse, ThesisMeta } from '@/lib/types';
import { MAX_FILE_BYTES, MAX_FILE_LABEL } from '@/lib/upload';
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadIcon,
  FileTextIcon,
  MarkdownIcon,
  SpinnerIcon,
  UploadIcon,
} from './Icons';
import { MarkdownView } from './MarkdownView';

interface FileUploaderProps {
  meta: ThesisMeta;
  markdown: string;
  convertInfo: ConvertInfo | null;
  onConverted: (payload: ConvertResponse) => void;
  onContinue: () => void;
  onBack: () => void;
}

const ACCEPT = '.docx,.pdf';

export function FileUploader({
  meta,
  markdown,
  convertInfo,
  onConverted,
  onContinue,
  onBack,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleFile = async (file: File) => {
    setError('');

    if (!/\.(docx|pdf)$/i.test(file.name)) {
      setError('فقط فایل‌های Word با پسوند .docx و فایل‌های PDF قابل استفاده‌اند. فایل‌های قدیمی .doc پشتیبانی نمی‌شوند.');
      return;
    }
    if (file.size === 0) {
      setError('فایل انتخاب‌شده خالی است.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`حجم فایل باید کمتر از ${MAX_FILE_LABEL} باشد.`);
      return;
    }

    setConverting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert', { method: 'POST', body: formData });
      const payload = await readJsonSafe<ConvertResponse & ApiErrorResponse>(response);

      if (!response.ok || !payload || typeof payload.markdown !== 'string') {
        setError(getApiError(payload, 'تبدیل فایل ناموفق بود. لطفاً فایل دیگری امتحان کنید.'));
        return;
      }

      onConverted({ markdown: payload.markdown, info: payload.info });
    } catch {
      setError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
    } finally {
      setConverting(false);
    }
  };

  const openFileDialog = () => {
    if (converting) return;
    inputRef.current?.click();
  };

  return (
    <section className="card space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">۳. بارگذاری فایل پایان‌نامه</h2>
          <p className="mt-1 text-sm text-slate-500">
            فایل Word یا PDF را انتخاب کنید.
          </p>
        </div>
        <span className="chip shrink-0">گام ۳ از ۴</span>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs leading-6 text-sky-900">
        <p className="font-semibold">
          حداکثر {MAX_FILE_LABEL} — فقط .docx و .pdf
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      <button
        type="button"
        onClick={openFileDialog}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        disabled={converting}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/50'
        } disabled:cursor-not-allowed disabled:opacity-70`}
        aria-label="انتخاب فایل پایان‌نامه"
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm">
          {converting ? <SpinnerIcon className="h-6 w-6 animate-spin" /> : <UploadIcon className="h-6 w-6" />}
        </span>
        <span className="text-sm font-semibold text-slate-800">
          {converting ? 'در حال تبدیل فایل…' : 'فایل را اینجا رها کنید یا کلیک کنید'}
        </span>
        <span className="text-xs text-slate-500">DOCX یا PDF — حداکثر {MAX_FILE_LABEL}</span>
      </button>

      {error ? (
        <div className="alert-error flex items-start gap-2" role="alert">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {convertInfo && markdown ? (
        <ConversionResult
          meta={meta}
          markdown={markdown}
          info={convertInfo}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
          onReplace={openFileDialog}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={converting}>
          <ArrowRightIcon className="h-4 w-4" />
          ویرایش مشخصات
        </button>
        <button type="button" className="btn-primary" onClick={onContinue} disabled={converting || !markdown}>
          ادامه به تحلیل هوشمند
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

interface ConversionResultProps {
  meta: ThesisMeta;
  markdown: string;
  info: ConvertInfo;
  expanded: boolean;
  onToggle: () => void;
  onReplace: () => void;
}

function ConversionResult({ meta, markdown, info, expanded, onToggle, onReplace }: ConversionResultProps) {
  const downloadName = buildDownloadName(meta, 'متن-استخراج-شده', 'md');

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white">
            <MarkdownIcon className="h-4 w-4" />
          </span>
          تبدیل با موفقیت انجام شد
        </div>
        <span className="chip border-emerald-200 bg-white text-emerald-700">
          <FileTextIcon className="h-3.5 w-3.5" />
          {info.fileName}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-xl bg-white p-3">
          <dt className="text-slate-500">نوع فایل</dt>
          <dd className="mt-0.5 font-bold text-slate-800">{info.fileType.toUpperCase()}</dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="text-slate-500">حجم</dt>
          <dd className="mt-0.5 font-bold text-slate-800">{formatBytes(info.fileSize)}</dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="text-slate-500">تعداد کلمات</dt>
          <dd className="mt-0.5 font-bold text-slate-800">{faNumber(info.words)}</dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="text-slate-500">{info.pages ? 'تعداد صفحات' : 'تعداد کاراکتر'}</dt>
          <dd className="mt-0.5 font-bold text-slate-800">
            {info.pages ? faNumber(info.pages) : faNumber(info.chars)}
          </dd>
        </div>
      </dl>

      {info.warnings.length ? (
        <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
          {info.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-1.5">
              <AlertIcon className="mt-1 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={`overflow-auto rounded-xl border border-slate-200 bg-white p-4 transition-all ${
          expanded ? 'max-h-[70vh]' : 'max-h-72'
        }`}
        aria-label="پیش‌نمایش متن استخراج‌شده"
      >
        <MarkdownView content={markdown} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={onToggle}>
          {expanded ? 'جمع کردن پیش‌نمایش' : 'نمایش کامل متن استخراج‌شده'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadMarkdown(markdown, downloadName)}
        >
          <DownloadIcon className="h-4 w-4" />
          دانلود Markdown
        </button>
        <button type="button" className="btn-ghost" onClick={onReplace}>
          انتخاب فایل دیگر
        </button>
      </div>
    </div>
  );
}
