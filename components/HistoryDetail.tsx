'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readJsonSafe } from '@/lib/api';
import { deleteLocalRecord, getLocalRecord } from '@/lib/local-store';
import type { ApiErrorResponse, EvaluationRecord, RecordResponse } from '@/lib/types';
import { AlertIcon, ArrowRightIcon, SpinnerIcon, TrashIcon } from './Icons';
import { EvaluationReportView } from './EvaluationReportView';

interface HistoryDetailProps {
  id: string;
}

export function HistoryDetail({ id }: HistoryDetailProps) {
  const router = useRouter();
  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  const [backend, setBackend] = useState<'kv' | 'local' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/history/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const payload = await readJsonSafe<RecordResponse & ApiErrorResponse>(response);
        if (response.ok && payload?.record) {
          if (cancelled) return;
          setRecord(payload.record);
          setBackend('kv');
          setLoading(false);
          return;
        }
      } catch {
        // سرور در دسترس نیست → جستجو در حافظه‌ی محلی
      }

      const local = getLocalRecord(id);
      if (cancelled) return;

      if (local) {
        setRecord(local);
        setBackend('local');
      } else {
        setError('این ارزیابی پیدا نشد. ممکن است حذف شده باشد یا مربوط به مرورگر دیگری باشد.');
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('این ارزیابی برای همیشه حذف شود؟')) return;

    setDeleting(true);
    setError('');
    try {
      if (backend === 'kv') {
        const response = await fetch(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) {
          setError('حذف از سرویس سوابق ناموفق بود. لطفاً دوباره تلاش کنید.');
          setDeleting(false);
          return;
        }
      }
      deleteLocalRecord(id);
      router.push('/history');
    } catch {
      setError('ارتباط با سرور برقرار نشد؛ حذف انجام نشد.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500" aria-busy="true">
        <SpinnerIcon className="h-5 w-5 animate-spin text-indigo-600" />
        در حال بارگذاری گزارش…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="card space-y-4 py-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
          <AlertIcon className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-slate-800">{error || 'رکورد موردنظر یافت نشد.'}</p>
        <Link href="/history" className="btn-secondary inline-flex">
          <ArrowRightIcon className="h-4 w-4" />
          بازگشت به سوابق
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/history" className="btn-ghost">
          <ArrowRightIcon className="h-4 w-4" />
          بازگشت به سوابق
        </Link>
        <button type="button" className="btn-danger" onClick={() => void handleDelete()} disabled={deleting}>
          {deleting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
          حذف این ارزیابی
        </button>
      </div>

      {error ? (
        <div className="alert-error flex items-start gap-2" role="alert">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <EvaluationReportView
        meta={record.meta}
        report={record.report}
        analysis={record.analysis}
        convert={record.convert}
        createdAt={record.createdAt}
        storageBackend={backend}
        instructions={record.instructions}
        mode={record.report.mode ?? record.mode}
        templateName={record.template?.name}
        onNewEvaluation={() => router.push('/')}
      />
    </div>
  );
}
