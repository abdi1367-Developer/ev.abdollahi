import type { Metadata } from 'next';
import { HistoryDetail } from '@/components/HistoryDetail';

export const metadata: Metadata = {
  title: 'گزارش ارزیابی',
  description: 'مشاهده و دانلود گزارش ارزیابی ذخیره‌شده.',
};

interface HistoryDetailPageProps {
  params: { id: string };
}

export default function HistoryDetailPage({ params }: HistoryDetailPageProps) {
  return <HistoryDetail id={params.id} />;
}
