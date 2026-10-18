import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-xl py-14 text-center">
      <p className="text-4xl font-extrabold text-indigo-600">۴۰۴</p>
      <h1 className="mt-3 text-lg font-bold text-slate-900">صفحه پیدا نشد</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        آدرسی که وارد کرده‌اید وجود ندارد یا جابه‌جا شده است. می‌توانید از صفحه‌ی اصلی ارزیابی جدیدی
        شروع کنید.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          صفحه‌ی اصلی
        </Link>
        <Link href="/history" className="btn-secondary">
          سوابق ارزیابی
        </Link>
      </div>
    </div>
  );
}
