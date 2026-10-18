'use client';

import { useMemo } from 'react';
import { faNumber } from '@/lib/format';
import { formatJalaliShort, isoToJalali } from '@/lib/jalali';
import type { HistorySummary } from '@/lib/types';
import { ChartEmpty, DonutChart, RadarChart, TrendChart } from './Charts';
import { AwardIcon, ChartIcon, TargetIcon, TrendingUpIcon } from './Icons';

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dateLabel(iso: string): string {
  const jalali = isoToJalali(iso.slice(0, 10));
  return jalali ? formatJalaliShort(jalali.jy, jalali.jm, jalali.jd) : '—';
}

export function HistoryDashboard({ items }: { items: HistorySummary[] }) {
  const stats = useMemo(() => {
    const scores = items.map((item) => Number(item.overall_score) || 0);
    const avg = average(scores);
    const sorted = [...scores].sort((a, b) => a - b);
    return {
      count: items.length,
      avg,
      high: sorted.length ? sorted[sorted.length - 1] : 0,
      low: sorted.length ? sorted[0] : 0,
      pass: scores.filter((score) => score >= 60).length,
    };
  }, [items]);

  const trend = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-10)
        .map((item) => ({ label: dateLabel(item.createdAt), value: Number(item.overall_score) || 0 })),
    [items],
  );

  const criteria = useMemo(() => {
    const buckets = new Map<string, { name: string; total: number; count: number }>();
    items.forEach((item) => {
      (item.criteria ?? []).forEach((criterion) => {
        const key = criterion.name.trim();
        if (!key) return;
        const current = buckets.get(key) ?? { name: key, total: 0, count: 0 };
        current.total += Number(criterion.score) || 0;
        current.count += 1;
        buckets.set(key, current);
      });
    });
    return [...buckets.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((bucket) => ({ label: bucket.name, value: bucket.total / Math.max(1, bucket.count) }));
  }, [items]);

  const qualitySegments = useMemo(() => {
    const buckets = [
      { label: 'عالی', min: 85, color: '#16a34a' },
      { label: 'خوب', min: 70, color: '#f59e0b' },
      { label: 'قابل قبول', min: 55, color: '#f97316' },
      { label: 'نیازمند بازنگری', min: 0, color: '#e11d48' },
    ];
    const counts = [0, 0, 0, 0];
    items.forEach((item) => {
      const score = Number(item.overall_score) || 0;
      const index = buckets.findIndex((bucket) => score >= bucket.min);
      counts[index < 0 ? 3 : index] += 1;
    });
    return buckets
      .map((bucket, index) => ({ label: bucket.label, value: counts[index], color: bucket.color }))
      .filter((segment) => segment.value > 0);
  }, [items]);

  const degreeSegments = useMemo(() => {
    const colors: Record<string, string> = {
      'کارشناسی': '#fdba74',
      'کارشناسی ارشد': '#f97316',
      'دکتری': '#c2410c',
    };
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const degree = item.meta.degree || 'سایر';
      counts.set(degree, (counts.get(degree) ?? 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({
      label,
      value,
      color: colors[label] ?? '#fbbf24',
    }));
  }, [items]);

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'میانگین نمره', value: faNumber(stats.avg, 1), icon: TrendingUpIcon, tone: 'text-orange-600' },
          { label: 'بیشترین نمره', value: faNumber(stats.high, 1), icon: AwardIcon, tone: 'text-emerald-600' },
          { label: 'کمترین نمره', value: faNumber(stats.low, 1), icon: TargetIcon, tone: 'text-rose-500' },
          { label: 'ارزیابی‌ها', value: faNumber(stats.count), icon: ChartIcon, tone: 'text-amber-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card flex items-center gap-3 !p-3.5 sm:!p-4">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900/5 dark:bg-white/10 ${stat.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold text-slate-400">{stat.label}</span>
                <span className="block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {stat.value}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <TrendingUpIcon className="h-4 w-4 text-orange-500" />
              روند نمره‌ها
            </h2>
            <span className="text-[10px] text-slate-400">۱۰ ارزیابی آخر</span>
          </div>
          <TrendChart data={trend} />
        </div>

        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <ChartIcon className="h-4 w-4 text-orange-500" />
            کیفیت ارزیابی‌ها
          </h2>
          <DonutChart
            segments={qualitySegments}
            centerValue={faNumber(stats.avg, 1)}
            centerLabel="میانگین"
            size={172}
          />
          <ul className="mt-3 space-y-1.5">
            {qualitySegments.map((segment) => (
              <li key={segment.label} className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.label}
                </span>
                <span className="font-bold tabular-nums">{faNumber(segment.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <TargetIcon className="h-4 w-4 text-orange-500" />
            میانگین معیارها
          </h2>
          {criteria.length >= 3 ? (
            <RadarChart data={criteria} size={330} />
          ) : (
            <ChartEmpty label="برای نمودار معیارها به سوابق بیشتری نیاز است." />
          )}
        </div>

        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <AwardIcon className="h-4 w-4 text-orange-500" />
            توزیع مقطع تحصیلی
          </h2>
          <DonutChart
            segments={degreeSegments}
            centerValue={faNumber(stats.count)}
            centerLabel="ارزیابی"
            size={172}
          />
          <ul className="mt-3 space-y-1.5">
            {degreeSegments.map((segment) => (
              <li key={segment.label} className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.label}
                </span>
                <span className="font-bold tabular-nums">{faNumber(segment.value)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-[11px] dark:bg-emerald-500/10">
            <span className="font-semibold text-emerald-800 dark:text-emerald-200">نمره‌های بالای ۶۰</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
              {faNumber(stats.pass)} از {faNumber(stats.count)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

