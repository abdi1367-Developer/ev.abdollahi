'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { readJsonSafe } from '@/lib/api';
import { faNumber, formatFaDate } from '@/lib/format';
import { deleteLocalRecord, readLocalSummaries } from '@/lib/local-store';
import { evaluationModeLabel } from '@/lib/evaluation-mode';
import { scoreTone } from '@/lib/ui';
import type { HistoryResponse, HistorySummary } from '@/lib/types';
import { AlertIcon, ArrowLeftIcon, ClockIcon, SearchIcon, SparklesIcon, TrashIcon } from './Icons';

type SortMode = 'newest' | 'oldest' | 'score-desc' | 'score-asc';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
  { value: 'score-desc', label: 'بیشترین نمره' },
  { value: 'score-asc', label: 'کمترین نمره' },
];

const DEGREE_OPTIONS = ['همه', 'کارشناسی', 'کارشناسی ارشد', 'دکتری'] as const;

function normalize(value: string): string {
  return String(value ?? '')
    .replace(/[\u200c\u200e\u200f]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function HistoryList() {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [backend, setBackend] = useState<'kv' | 'local'>('local');
  const [query, setQuery] = useState('');
  const [degree, setDegree] = useState<(typeof DEGREE_OPTIONS)[number]>('همه');
  const [sort, setSort] = useState<SortMode>('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let serverItems: HistorySummary[] | null = null;
      let source: 'kv' | 'local' = 'local';

      try {
        const response = await fetch('/api/history', { cache: 'no-store' });
        const payload = await readJsonSafe<HistoryResponse>(response);
        if (response.ok && payload?.backend === 'kv' && payload.persistent) {
          serverItems = payload.items;
          source = 'kv';
        }
      } catch {
        // در دسترس نبودن سرور → سوابق محلی
      }

      const loaded = serverItems ?? readLocalSummaries();
      if (cancelled) return;
      setItems(loaded);
      setBackend(source);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = normalize(query);
    const filtered = items.filter((item) => {
      if (degree !== 'همه' && item.meta.degree !== degree) return false;
      if (!needle) return true;
      const haystack = normalize(
        [
          item.meta.title,
          item.meta.studentName,
          item.meta.studentId,
          item.meta.supervisor,
          item.meta.advisor,
          item.meta.university,
          item.meta.field,
        ].join(' '),
      );
      return haystack.includes(needle);
    });

    const sorted = [...filtered];
    sorted.sort((first, second) => {
      if (sort === 'score-desc') return second.overall_score - first.overall_score;
      if (sort === 'score-asc') return first.overall_score - second.overall_score;
      const firstTime = new Date(first.createdAt).getTime() || 0;
      const secondTime = new Date(second.createdAt).getTime() || 0;
      return sort === 'oldest' ? firstTime - secondTime : secondTime - firstTime;
    });

    return sorted;
  }, [items, query, degree, sort]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('این ارزیابی برای همیشه حذف شود؟')) return;

    setDeletingId(id);
    setError('');
    try {
      if (backend === 'kv') {
        const response = await fetch(`/api/history/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          setError('حذف از سرویس سوابق ناموفق بود. لطفاً دوباره تلاش کنید.');
          return;
        }
      }
      deleteLocalRecord(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setError('ارتباط با سرور برقرار نشد؛ حذف انجام نشد.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">سوابق ارزیابی</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'در حال بارگذاری…' : `${faNumber(items.length)} ارزیابی ذخیره‌شده`}
          </p>
        </div>
        <Link href="/" className="btn-primary">
          <SparklesIcon className="h-4 w-4" />
          ارزیابی جدید
        </Link>
      </header>

      {!loading && backend === 'local' ? (
        <div className="alert-warning leading-6">
          <p className="font-semibold">سوابق به‌صورت محلی نگه داشته می‌شوند</p>
          <p className="mt-1 text-xs">
            سرویس ذخیره‌سازی دائمی (KV) در دسترس نیست؛ سوابق فقط در همین مرورگر و همین دستگاه باقی
            می‌مانند و با پاک کردن داده‌های مرورگر از بین می‌روند. برای ذخیره‌سازی دائمی، متغیرهای
            KV_REST_API_URL و KV_REST_API_TOKEN را تنظیم کنید.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="alert-error flex items-start gap-2" role="alert">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field pr-10"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو بر اساس عنوان، دانشجو، استاد یا دانشگاه…"
              aria-label="جستجو در سوابق"
            />
          </div>

          <select
            className="field"
            value={degree}
            onChange={(event) => setDegree(event.target.value as (typeof DEGREE_OPTIONS)[number])}
            aria-label="فیلتر بر اساس مقطع"
          >
            {DEGREE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'همه' ? 'همه مقاطع' : option}
              </option>
            ))}
          </select>

          <select
            className="field"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            aria-label="ترتیب نمایش"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {query || degree !== 'همه' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {faNumber(visible.length)} نتیجه از {faNumber(items.length)} ارزیابی
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setQuery('');
                setDegree('همه');
              }}
            >
              پاک کردن فیلترها
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری سوابق">
          {[0, 1, 2].map((row) => (
            <div key={row} className="card animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/15" />
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : visible.length ? (
        <ul className="space-y-3">
          {visible.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              deleting={deletingId === item.id}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      ) : (
        <div className="card py-12 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {items.length ? 'ارزیابی‌ای با این فیلترها پیدا نشد.' : 'هنوز ارزیابی‌ای ذخیره نکرده‌اید.'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {items.length
              ? 'عبارت جستجو یا فیلترها را تغییر دهید.'
              : 'اولین پایان‌نامه را بارگذاری کنید تا گزارش آن در اینجا بایگانی شود.'}
          </p>
          <Link href="/" className="btn-primary mt-4 inline-flex">
            شروع ارزیابی
          </Link>
        </div>
      )}
    </div>
  );
}

interface HistoryCardProps {
  item: HistorySummary;
  deleting: boolean;
  onDelete: (id: string) => void | Promise<void>;
}

function HistoryCard({ item, deleting, onDelete }: HistoryCardProps) {
  const tone = scoreTone(item.overall_score);

  return (
    <li className="card flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-50 py-3">
        <span className={`text-xl font-extrabold tabular-nums ${tone.text}`}>
          {faNumber(item.overall_score, 1)}
        </span>
        <span className="text-[10px] text-slate-500">از ۱۰۰</span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/history/${item.id}`}
            className="truncate text-sm font-bold text-slate-900 transition hover:text-indigo-700 dark:text-white dark:hover:text-indigo-300"
          >
            {item.meta.title}
          </Link>
          <span className="chip">{item.meta.degree}</span>
          <span className="chip uppercase">{item.fileType}</span>
          {item.templateName ? <span className="chip">{item.templateName}</span> : null}
          {item.mode ? <span className="chip">ارزیابی {evaluationModeLabel(item.mode)}</span> : null}
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {[item.meta.studentName, item.meta.university, item.meta.supervisor ? `استاد راهنما: ${item.meta.supervisor}` : '']
            .filter(Boolean)
            .join(' — ')}
        </p>
        <p className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            {formatFaDate(item.createdAt)}
          </span>
          <span dir="ltr" className="inline-block max-w-[16rem] truncate">
            {item.model}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/history/${item.id}`} className="btn-secondary">
          مشاهده گزارش
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <button
          type="button"
          className="btn-danger"
          onClick={() => void onDelete(item.id)}
          disabled={deleting}
          aria-label={`حذف ارزیابی ${item.meta.title}`}
        >
          {deleting ? <span className="text-xs">…</span> : <TrashIcon className="h-4 w-4" />}
        </button>
      </div>
    </li>
  );
}
