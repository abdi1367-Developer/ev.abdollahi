import type { Metadata } from 'next';
import { UserManager } from '@/components/UserManager';

export const metadata: Metadata = {
  title: 'مدیریت کاربران',
  description: 'ساخت، ویرایش و غیرفعال‌سازی کاربران سامانه',
};

export default function AdminUsersPage() {
  return <UserManager />;
}
