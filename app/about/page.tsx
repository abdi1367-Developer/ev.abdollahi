import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  InfoIcon,
  LayersIcon,
  MarkdownIcon,
  SaveIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
  UserIcon,
} from '@/components/Icons';

export const metadata: Metadata = {
  title: 'درباره ما',
  description:
    'درباره‌ی ارزیاب هوشمند پایان‌نامه؛ فرایند کار، معماری فنی، امنیت، حریم خصوصی و محدودیت‌ها — اثری از علی عبدالهی.',
};

const AUTHOR_NAME = 'علی عبدالهی';

const HERO_STATS = [
  { label: 'سقف حجم فایل', value: '۱۰ مگابایت' },
  { label: 'مراحل ارزیابی', value: '۵ مرحله' },
  { label: 'اعتبار نشست', value: '۷ روز' },
  { label: 'اعتبارسنجی', value: 'کلاینت + سرور' },
];

const PILLARS = [
  {
    icon: UploadIcon,
    title: 'تبدیل دقیق',
    text: 'دریافت Word یا PDF، تشخیص نوع فایل از امضای بایت‌ها و تبدیل متن به Markdown قابل ویرایش.',
  },
  {
    icon: SparklesIcon,
    title: 'ارزیابی ساختارمند',
    text: 'قالب‌های ارزیابی قابل تنظیم با معیار و وزن دلخواه؛ نمره‌ی نهایی در سرور و مستقل از خروجی مدل محاسبه می‌شود.',
  },
  {
    icon: SaveIcon,
    title: 'بایگانی و پیگیری',
    text: 'ذخیره‌ی گزارش‌ها با امکان جستجو، فیلتر مقطع و مقایسه‌ی نمره‌ها در طول زمان.',
  },
];

const STEPS = [
  'مشخصات پایان‌نامه (عنوان، نام دانشجو و شماره تماس) ثبت و در کلاینت و سرور اعتبارسنجی می‌شود.',
  'فایل در مسیر /api/convert بررسی، محدودیت حجم اعمال و متن آن به Markdown تبدیل می‌شود.',
  'در صورت نیاز، متن با حفظ نقشه‌ی سرفصل‌ها فشرده می‌شود تا در پنجره‌ی مدل جا شود.',
  'مدل زبانی با پرامپت معیارمحور فراخوانی و پاسخ آن نرمال‌سازی و اعتبارسنجی می‌شود.',
  'نمره‌ی وزنی در سرور محاسبه، گزارش ساخته و رکورد در سوابق ذخیره می‌شود.',
];

const ARCHITECTURE = [
  {
    icon: LayersIcon,
    title: 'لایه‌ی رابط کاربری',
    text: 'Next.js 14 با App Router و TypeScript؛ استایل‌دهی با Tailwind CSS، چیدمان RTL و کامپوننت‌های شیشه‌ای. تم روز/شب با کلاس dark و ذخیره‌ی انتخاب کاربر در localStorage اعمال می‌شود.',
  },
  {
    icon: FileTextIcon,
    title: 'لایه‌ی پردازش متن',
    text: 'Route Handler مسیر /api/convert با mammoth برای .docx و unpdf برای PDF؛ بررسی magic bytes، سقف ۱۰ مگابایت و تولید Markdown با آمار کاراکتر، واژه و صفحات. فایل‌های بزرگ‌تر از ۴ مگابایت از طریق Vercel Blob مستقیماً از مرورگر آپلود می‌شوند.',
  },
  {
    icon: SparklesIcon,
    title: 'لایه‌ی هوش مصنوعی',
    text: 'مسیر /api/analyze متن را به پیام مدل تبدیل می‌کند: ابتدا مدل‌های رایگان OpenRouter و در صورت شکست، DeepSeek. بودجه‌ی زمانی، timeout هر مدل و تلاش‌های ناموفق ثبت می‌شوند.',
  },
  {
    icon: ShieldIcon,
    title: 'اعتبارسنجی و نمره‌دهی',
    text: 'پاسخ مدل با ساختار JSON اعتبارسنجی و در برابر معیارهای قالب انتخابی نرمال می‌شود؛ قالب‌ها در lib/templates.ts تعریف شده‌اند و میانگین وزنی صرفاً در سرور محاسبه می‌شود.',
  },
  {
    icon: SaveIcon,
    title: 'لایه‌ی داده',
    text: 'ذخیره‌سازی دائمی با Upstash Redis / Vercel KV از طریق /api/history؛ در نبود KV، سوابق به‌صورت محلی در مرورگر نگه داشته می‌شوند. هر رکورد شامل مشخصات، متن کوتاه‌شده، گزارش، اطلاعات مدل و دستور تحلیل است.',
  },
  {
    icon: ShieldIcon,
    title: 'احراز هویت و کاربران',
    text: 'ورود با کوکی امضاشده و HTTP-only؛ رمزها با scrypt هش می‌شوند. مدیر می‌تواند کاربر بسازد، نقش و وضعیت را تغییر دهد و رمز را بازنشانی کند. کاربران در KV یا فایل محلی نگهداری می‌شوند و دسترسی صفحات با middleware محافظت می‌شود.',
  },
  {
    icon: MarkdownIcon,
    title: 'خروجی و گزارش',
    text: 'گزارش ساختارمند شامل نمره‌ی کل، نمره و وزن هر معیار، نقاط قوت و ضعف، خلاصه و پیشنهادهای اصلاحی؛ قابل دانلود به Markdown یا JSON و آماده‌ی استفاده در مستندات.',
  },
];

const SECURITY = [
  {
    icon: ShieldIcon,
    title: 'نشست امضاشده',
    text: 'ورود با کوکی HttpOnly و امضای HMAC-SHA256 انجام می‌شود؛ کوکی در Production فقط روی HTTPS ارسال می‌شود، SameSite=Lax است و پس از ۷ روز منقضی می‌شود.',
  },
  {
    icon: UserIcon,
    title: 'هش رمز عبور',
    text: 'رمزها با الگوریتم scrypt و نمک تصادفی ۱۶ بایتی هش می‌شوند؛ مقایسه‌ی هش با timingSafeEqual انجام می‌شود و رمز خام هرگز ذخیره یا به کلاینت برگردانده نمی‌شود.',
  },
  {
    icon: LayersIcon,
    title: 'کنترل دسترسی دو لایه',
    text: 'Middleware مسیرهای خصوصی و APIها را می‌بندد و نقش مدیر را بررسی می‌کند؛ عملیات مدیریتی در Route Handlerها با requireAdmin دوباره اعتبارسنجی می‌شود.',
  },
  {
    icon: ClockIcon,
    title: 'محدودیت تلاش ورود',
    text: 'برای هر IP حداکثر ۲۰ تلاش ورود در بازه‌ی ۱۰ دقیقه پذیرفته می‌شود تا حملات حدس رمز کندتر شوند؛ این شمارنده در حافظه‌ی هر نمونه‌ی سرور نگه داشته می‌شود.',
  },
  {
    icon: FileTextIcon,
    title: 'اعتبارسنجی ورودی و فایل',
    text: 'مشخصات در کلاینت و سرور بررسی می‌شود؛ نوع فایل با MIME، پسوند و امضای بایت‌های ابتدایی (magic bytes) تشخیص داده می‌شود و سقف ۱۰ مگابایت اعمال می‌گردد. فایل موقت پس از تبدیل از Vercel Blob حذف می‌شود.',
  },
  {
    icon: SaveIcon,
    title: 'کلیدها و داده‌ها',
    text: 'کلیدهای OpenRouter و DeepSeek فقط در متغیرهای محیطی سرور می‌مانند و به مرورگر نمی‌رسند. فایل خام پس از تبدیل در سوابق ذخیره نمی‌شود؛ متن استخراج‌شده و گزارش در KV (یا localStorage) نگه داشته می‌شود.',
  },
];

const LIMITS = [
  'گزارش هوش مصنوعی جایگزین داوری رسمی، دفاع یا نظر استاد راهنما نیست و باید به‌عنوان ابزار کمکی خوانده شود.',
  'مدل زبانی ممکن است اشتباه کند؛ همه‌ی داوری‌ها باید با متن پایان‌نامه و شواهد آن سنجیده شوند.',
  'فایل‌های اسکن‌شده‌ی تصویری (PDF بدون لایه‌ی متنی) قابل استخراج نیستند.',
  'برای متن‌های بسیار بلند، بخشی از محتوا نمونه‌برداری می‌شود؛ این محدودیت در گزارش ذکر می‌شود.',
  'بدون KV در محیط Serverless، سوابق و تغییرات کاربران پایدار نیستند؛ برای Production باید ذخیره‌سازی دائمی تنظیم شود.',
  'قالب‌های سفارشی در localStorage مرورگر نگه داشته می‌شوند و بین دستگاه‌ها همگام نمی‌شوند.',
];

const STACK = [
  'Next.js 14',
  'TypeScript',
  'Tailwind CSS',
  'mammoth',
  'unpdf',
  'OpenRouter',
  'DeepSeek',
  'Upstash Redis',
];

const UX_POINTS = [
  'چیدمان راست‌به‌چپ و فونت وزیرمتن با جایگزین سیستمی در صورت قطع دسترسی به CDN.',
  'تم روز و شب با ذخیره‌ی انتخاب در مرورگر و اعمال پیش از رندر، بدون پرش رنگ.',
  'چیدمان واکنش‌گرا برای موبایل و نمایشگرهای بزرگ، همراه با گزارش‌های خوانا و قابل دانلود.',
];

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-orange-200/70 bg-brand-gradient p-5 text-white shadow-glow sm:p-8 lg:p-10 dark:border-white/10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-amber-100/30 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
              <InfoIcon className="h-3.5 w-3.5" />
              درباره سامانه
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-orange-950/10 px-3 py-1 text-[11px] font-semibold text-orange-50/90">
              <ShieldIcon className="h-3.5 w-3.5" />
              امنیت و شفافیت داده
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-extrabold leading-[1.55] sm:text-4xl sm:leading-[1.45] lg:text-[2.35rem]">
            ارزیابی پایان‌نامه، از تبدیل متن تا گزارشی که می‌توان پیگیری کرد
          </h1>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <p className="text-sm leading-8 text-orange-50 sm:text-[15px]">
              ارزیاب هوشمند پایان‌نامه، ارزیابی را از یک برداشت شخصی و پراکنده به یک فرایند روشن تبدیل
              می‌کند: فایل شما به متن قابل ویرایش تبدیل می‌شود، قالب و وزن معیارها قابل تنظیم است و در
              پایان، گزارشی ساختارمند با پیشنهادهای عملی دریافت می‌کنید.
            </p>
            <p className="text-[13px] leading-8 text-orange-50/90 sm:text-sm">
              همه‌ی مراحل در یک محیط فارسی، ساده و قابل پیگیری انجام می‌شود تا تمرکز شما روی محتوا بماند،
              نه روی ابزار. امنیت نشست، کنترل دسترسی و شفافیت ذخیره‌سازی داده از همان ابتدا در طراحی لحاظ
              شده است.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="ltr rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-orange-700 shadow-lg transition hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              ورود به سامانه
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <span className="text-[11px] font-semibold text-orange-50/[0.85]">
              نسخه‌ی وب — بدون نصب، سازگار با موبایل
            </span>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {HERO_STATS.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl"
              >
                <dt className="text-[10px] font-semibold text-orange-50/75">{item.label}</dt>
                <dd className="mt-1 text-base font-extrabold tabular-nums text-white sm:text-lg">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="pillars-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              سه ستون اصلی
            </span>
            <h2
              id="pillars-heading"
              className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white"
            >
              از فایل خام تا گزارش قابل استفاده
            </h2>
          </div>
          <p className="max-w-2xl text-[13px] leading-7 text-slate-600 sm:text-left dark:text-slate-300">
            هر بخش یک وظیفه‌ی مشخص دارد و خروجی آن به‌عنوان ورودی مرحله‌ی بعد استفاده می‌شود؛ همین
            زنجیره‌ی روشن، نتیجه را قابل بازبینی و مقایسه می‌کند.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className="card h-full">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-orange-600/20">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-7 text-slate-600 dark:text-slate-300">
                  {pillar.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="block text-[10px] font-bold text-orange-700 dark:text-orange-300">
                  فرایند شفاف
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  چطور کار می‌کند؟
                </h2>
              </div>
            </div>
            <span className="chip">۵ مرحله، بدون تنظیم پیچیده</span>
          </div>

          <ol className="mt-5 grid gap-3 lg:grid-cols-2">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className={`flex items-start gap-3 rounded-2xl border border-orange-100/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04] ${
                  STEPS.length % 2 === 1 && index === STEPS.length - 1 ? 'lg:col-span-2' : ''
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-gradient text-xs font-extrabold text-white shadow-sm">
                  {(index + 1).toLocaleString('fa-IR')}
                </span>
                <p className="pt-1 text-[13px] leading-7 text-slate-600 dark:text-slate-300">
                  {step}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-orange-200/70 bg-orange-50/60 px-4 py-3 text-[12px] font-semibold leading-6 text-orange-900 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-100">
            <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
            اعتبارسنجی فقط در رابط کاربری انجام نمی‌شود؛ هر مرحله در سرور دوباره بررسی می‌شود.
          </p>
        </div>
      </section>

      <section aria-labelledby="architecture-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              زیر پوست سامانه
            </span>
            <h2
              id="architecture-heading"
              className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white"
            >
              معماری فنی
            </h2>
          </div>
          <p className="max-w-2xl text-[13px] leading-7 text-slate-600 sm:text-left dark:text-slate-300">
            ساختار پروژه لایه‌بندی‌شده است تا هر بخش مستقل از دیگری قابل توسعه و آزمون باشد: رابط
            کاربری، مسیرهای API، موتور تبدیل متن، لایه‌ی مدل زبانی، اعتبارسنجی و ذخیره‌سازی.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ARCHITECTURE.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="card">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                </div>
                <p className="mt-2.5 text-[13px] leading-7 text-slate-600 dark:text-slate-300">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-orange-100/80 bg-white/50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
            فناوری‌های اصلی:
          </span>
          {STACK.map((tech) => (
            <span key={tech} className="chip ltr font-semibold">
              {tech}
            </span>
          ))}
        </div>
      </section>

      <section
        id="security"
        aria-labelledby="security-heading"
        className="relative overflow-hidden rounded-[2rem] border border-orange-200/70 bg-gradient-to-br from-orange-50/80 via-white/60 to-amber-50/70 p-5 shadow-glass backdrop-blur-2xl sm:p-7 dark:border-white/10 dark:from-orange-500/[0.07] dark:via-white/[0.045] dark:to-amber-500/[0.045]"
      >
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300">
                <ShieldIcon className="h-4 w-4" />
                امنیت سامانه
              </span>
              <h2
                id="security-heading"
                className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white"
              >
                دسترسی کنترل‌شده، داده‌ی شفاف
              </h2>
            </div>
            <p className="max-w-xl text-[13px] leading-7 text-slate-600 sm:text-left dark:text-slate-300">
              امنیت در این سامانه یک بخش جداگانه نیست؛ از لحظه‌ی ورود تا ذخیره‌ی گزارش، در هر لایه
              بررسی و اعتبارسنجی انجام می‌شود.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SECURITY.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-orange-100/80 bg-white/[0.65] p-4 dark:border-white/10 dark:bg-white/[0.035]"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-[12px] leading-7 text-slate-600 dark:text-slate-300">
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-orange-200/70 bg-orange-50/70 px-4 py-3 dark:border-orange-400/20 dark:bg-orange-500/10">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-orange-700 dark:text-orange-300" />
            <p className="text-[12px] leading-6 text-orange-900 dark:text-orange-100">
              <strong className="font-extrabold">پیش‌نیاز استقرار امن:</strong> در محیط Production باید
              <code className="ltr mx-1 rounded bg-white/70 px-1 py-0.5 text-[10px] font-bold dark:bg-black/20">
                AUTH_SECRET
              </code>
              و
              <code className="ltr mx-1 rounded bg-white/70 px-1 py-0.5 text-[10px] font-bold dark:bg-black/20">
                ADMIN_PASSWORD
              </code>
              تنظیم شوند و برای پایداری کاربران و سوابق، اتصال KV فعال باشد.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="details-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              جزئیات مهم
            </span>
            <h2
              id="details-heading"
              className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white"
            >
              امکانات تکمیلی و محدودیت‌ها
            </h2>
          </div>
          <p className="max-w-2xl text-[13px] leading-7 text-slate-600 sm:text-left dark:text-slate-300">
            دستور تحلیل، دامنه‌ی کاربرد و محدودیت‌هایی که باید پیش از استفاده بدانید.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="card h-full">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                دستور تحلیل سفارشی
              </h3>
            </div>
            <p className="mt-2 text-[13px] leading-7 text-slate-600 dark:text-slate-300">
              در مرحله‌ی تحلیل می‌توانید چارچوب ارزیابی را خودتان تعیین کنید؛ مثلاً «بر اساس مدل CIPP
              تحلیل کن»، «چارچوب SWOT را اعمال کن» یا «تمرکز را روی فصل روش‌شناسی بگذار». چند دستور
              آماده هم برای شروع وجود دارد.
            </p>
            <ul className="mt-3 space-y-2 text-[13px] leading-7 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-1.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                دستور شما بر چارچوب و تمرکز گزارش اثر می‌گذارد.
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-1.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                ساختار خروجی، معیارهای قالب انتخابی و مقیاس نمره‌دهی ثابت می‌ماند تا نتایج قابل مقایسه
                باشند.
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-1.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                متن دستور همراه گزارش ذخیره می‌شود تا بعداً بدانید تحلیل بر چه پایه‌ای انجام شده است.
              </li>
            </ul>
          </article>

          <article className="card h-full">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                <AlertIcon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                محدودیت‌های شناخته‌شده
              </h3>
            </div>
            <ul className="mt-3 space-y-2 text-[13px] leading-7 text-slate-600 dark:text-slate-300">
              {LIMITS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="ux-heading" className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300">
                <InfoIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="block text-[10px] font-bold text-orange-700 dark:text-orange-300">
                  تجربه‌ی کاربری
                </span>
                <h2 id="ux-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                  طراحی و تجربه‌ی کاربری
                </h2>
              </div>
            </div>
            <span className="chip">راست‌به‌چپ و واکنش‌گرا</span>
          </div>

          <p className="mt-3 max-w-5xl text-[13px] leading-7 text-slate-600 dark:text-slate-300">
            رابط کاربری با زبان بصری شیشه‌ای، گوشه‌های نرم و گرادیان‌های نارنجی-کهربایی طراحی شده است.
            فونت فارسی وزیرمتن (با جایگزین سیستمی در صورت قطع دسترسی به CDN)، چیدمان راست‌به‌چپ و
            پشتیبانی از تم روز و شب، خواندن گزارش‌ها را روی موبایل و نمایشگرهای بزرگ راحت می‌کند.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {UX_POINTS.map((point) => (
              <div
                key={point}
                className="flex items-start gap-2 rounded-2xl border border-orange-100/80 bg-white/60 p-3.5 dark:border-white/10 dark:bg-white/[0.035]"
              >
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                <p className="text-[12px] leading-6 text-slate-600 dark:text-slate-300">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-orange-200/70 bg-gradient-to-br from-white/75 via-orange-50/[0.55] to-amber-50/60 p-6 text-center shadow-glass backdrop-blur-2xl sm:p-8 dark:border-white/10 dark:from-white/[0.06] dark:via-orange-500/[0.04] dark:to-amber-500/[0.04]">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" />

        <div className="relative">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-orange-600/20">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
            طراحی و توسعه:{' '}
            <span className="text-orange-700 dark:text-orange-300">{AUTHOR_NAME}</span>
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-[12px] leading-7 text-slate-500 dark:text-slate-400">
            اگر پیشنهادی برای بهبود معیارها، پرامپت یا تجربه‌ی کاربری دارید، خوشحال می‌شوم بشنوم. هدف این
            ابزار، کمک به نوشتن پایان‌نامه‌های دقیق‌تر و داوری منصفانه‌تر است.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/login" className="btn-primary px-4 py-2.5 text-xs">
              ورود به سامانه
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <span className="chip">ابزار کمکی داوری</span>
          </div>
        </div>
      </section>
    </div>
  );
}



