import { Wizard } from '@/components/Wizard';
import {
  ChartIcon,
  CheckIcon,
  FileTextIcon,
  LayersIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
} from '@/components/Icons';

const FLOW = [
  { icon: LayersIcon, title: 'قالب', text: 'انتخاب یا طراحی معیارها' },
  { icon: FileTextIcon, title: 'مشخصات', text: 'ثبت اطلاعات پایان‌نامه' },
  { icon: UploadIcon, title: 'فایل', text: 'Word یا PDF' },
  { icon: ChartIcon, title: 'گزارش', text: 'نمره و نمودار تحلیلی' },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-brand-gradient p-5 text-white shadow-glow sm:p-8 lg:p-10 dark:border-white/10">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-brand-sheen opacity-60" />

        <div className="relative grid items-center gap-7 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              <ShieldIcon className="h-3.5 w-3.5" />
              ارزیابی ساختارمند پایان‌نامه
            </span>

            <h1 className="mt-4 text-2xl font-extrabold leading-[1.55] sm:text-4xl sm:leading-[1.4]">
              از فایل تا گزارش،
              <span className="block text-amber-100">در یک مسیر روشن</span>
            </h1>

            <p className="mt-2 max-w-md text-sm leading-7 text-orange-50">
              تحلیل معیارمحور، نمودارهای تحلیلی و خروجی قابل ارائه.
            </p>

            <a href="#evaluation" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-orange-700 shadow-lg transition hover:bg-orange-50 sm:text-sm">
              شروع ارزیابی
              <SparklesIcon className="h-4 w-4" />
            </a>
          </div>

          <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2">
            {FLOW.map((item, index) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="relative rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md transition hover:bg-white/15"
                >
                  <span className="absolute left-3 top-3 text-[10px] font-bold text-white/50">
                    ۰{(index + 1).toLocaleString('fa-IR')}
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="mt-2 block text-xs font-extrabold">{item.title}</span>
                  <span className="mt-0.5 block text-[10px] leading-5 text-orange-100">{item.text}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/15 pt-4 text-[11px] font-semibold text-orange-50">
          {['قالب‌های قابل ویرایش', 'تقویم شمسی', 'خروجی Markdown و JSON', 'داشبورد تحلیلی'].map((item) => (
            <span key={item} className="inline-flex items-center gap-1">
              <CheckIcon className="h-3 w-3" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <div id="evaluation" className="scroll-mt-24">
        <Wizard />
      </div>
    </div>
  );
}

