import type { Metadata } from 'next';
import { HistoryView } from '@/components/HistoryView';

export const metadata: Metadata = {
  title: 'سوابق ارزیابی',
  description: 'داشبورد تحلیلی و فهرست ارزیابی‌های ذخیره‌شده با امکان جستجو، فیلتر و مشاهده‌ی گزارش.',
};

export default function HistoryPage() {
  return <HistoryView />;
}
