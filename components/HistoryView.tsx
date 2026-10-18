'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { readJsonSafe } from '@/lib/api';
import { faNumber, formatFaDate } from '@/lib/format';
import { deleteLocalRecord, readLocalSummaries } from '@/lib/local-store';
import { scoreTone } from '@/lib/ui';
import type { HistoryResponse, HistorySummary } from '@/lib/types';
import {
  AlertIcon,
  ArrowLeftIcon,
  ChartIcon,
  ClockIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from './Icons';
import { HistoryDashboard } from './HistoryDashboard';

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

export function HistoryView() {
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
        const response = await fetch(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) {
          setError('حذف از سرویس سوابق ناموفق بود. دوباره تلاش کنید.');
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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/60 p-5 shadow-glass backdrop-blur-2xl sm:p-6 dark:border-white/10 dark:bg-white/[0.045]">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300">
              <ChartIcon className="h-3.5 w-3.5" />
              داشبورد سوابق
            </span>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">
              سوابق ارزیابی
            </h1>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {backend === 'kv' ? 'ذخیره‌شده در Vercel' : 'ذخیره‌شده در این مرورگر'}
            </p>
          </div>
          <Link href="/" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            ارزیابی جدید
          </Link>
        </div>
      </section>

      {error ? (
        <div className="alert-error flex items-start gap-2" role="alert">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500" aria-busy="true">
          در حال بارگذاری…
        </div>
      ) : (
        <>
          <HistoryDashboard items={items} />

          {items.length ? (
            <section className="card space-y-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                <label className="relative block">
                  <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field pr-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جستجوی عنوان، دانشجو، دانشگاه…"
                    aria-label="جستجوی سوابق"
                  />
                </label>
                <select
                  className="field"
                  value={degree}
                  onChange={(event) => setDegree(event.target.value as (typeof DEGREE_OPTIONS)[number])}
                  aria-label="فیلتر مقطع"
                >
                  {DEGREE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'همه' ? 'همه‌ی مقاطع' : option}
                    </option>
                  ))}
                </select>
                <select
                  className="field"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="مرتب‌سازی"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                {faNumber(visible.length)} از {faNumber(items.length)} ارزیابی
              </p>
            </section>
          ) : null}

          {visible.length ? (
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
                {items.length ? 'نتیجه‌ای با این فیلترها پیدا نشد.' : 'هنوز ارزیابی‌ای ثبت نشده است.'}
              </p>
              <Link href="/" className="btn-primary mt-4 inline-flex">
                شروع ارزیابی
              </Link>
            </div>
          )}
        </>
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
    <li className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 sm:w-24 sm:shrink-0 sm:flex-col sm:justify-center sm:rounded-2xl sm:bg-slate-50 sm:py-3 sm:dark:bg-white/[0.04]">
        <span className={`text-xl font-extrabold tabular-nums ${tone.text}`}>
          {faNumber(item.overall_score, 1)}
        </span>
        <span className="text-[10px] text-slate-500">از ۱۰۰</span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/history/${item.id}`}
            className="truncate text-sm font-bold text-slate-900 transition hover:text-orange-700 dark:text-white dark:hover:text-orange-300"
          >
            {item.meta.title}
          </Link>
          <span className="chip">{item.meta.degree}</span>
          <span className="chip uppercase">{item.fileType}</span>
          {item.templateName ? <span className="chip-brand">{item.templateName}</span> : null}
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
        <Link href={`/history/${item.id}`} className="btn-secondary flex-1 sm:flex-none">
          مشاهده
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


