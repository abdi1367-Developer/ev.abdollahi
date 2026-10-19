/**
 * حالت‌های ارزیابی: خوش‌بینانه، متعادل و بدبینانه (سخت‌گیرانه).
 *
 * «حالت» فقط میزان سخت‌گیری در نمره‌دهی و لحن گزارش را تغییر می‌دهد؛
 * قواعد الزامی داوری (استناد به متن، پرهیز از ساختن داده، قالب JSON و
 * محاسبه‌ی میانگین وزنی) در همه‌ی حالت‌ها یکسان است.
 *
 * این فایل فقط تایپ و تابع خالص دارد تا هم در کلاینت و هم در Route Handlerها
 * قابل استفاده باشد (برای ساخت پرامپت مدل و نمایش برچسب در رابط کاربری).
 */
import type { EvaluationMode } from './types';

export interface EvaluationModeDefinition {
  id: EvaluationMode;
  /** برچسب فارسی برای نمایش در رابط کاربری و گزارش */
  label: string;
  /** توضیح کوتاه برای کارت انتخاب حالت */
  description: string;
  /** جمله‌ی کوتاه درباره‌ی نگاه داور در این حالت */
  stance: string;
  /** بازه‌ی معمول نمره‌ی کلی در این حالت (برای نمایش و راهنمای مدل) */
  expectedRange: string;
  /** کلاس‌های رنگ برچسب (Chip) در گزارش و سوابق */
  chipClass: string;
  /** کلاس‌های کارت انتخاب‌شده در فرم تحلیل */
  activeClass: string;
  /** قواعد نمره‌دهی این حالت که در پرامپت مدل درج می‌شود */
  guidance: string[];
}

export const DEFAULT_EVALUATION_MODE: EvaluationMode = 'balanced';

export const EVALUATION_MODES: EvaluationModeDefinition[] = [
  {
    id: 'optimistic',
    label: 'خوش‌بینانه',
    description: 'نگاه فرصت‌محور به نقاط قوت؛ نمره‌ی منصفانه و مشوقانه برای متن متعارف.',
    stance: 'داور خوش‌بین اما صادق که ابتدا ظرفیت‌ها و نقاط قوت کار را می‌بیند',
    expectedRange: '۷۸ تا ۹۶',
    chipClass:
      'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    activeClass:
      'border-emerald-400 bg-emerald-50 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-500/15',
    guidance: [
      'در حالت خوش‌بینانه داوری می‌کنی: ابتدا ظرفیت‌ها و نقاط قوت کار را ببین و کاستی‌ها را به‌عنوان «فرصت بهبود» صورت‌بندی کن.',
      'اگر پایان‌نامه حداقل‌های ساختاری و علمی مقطع خود را دارد، نمره‌ی معیارها را در بازه‌ی ۷۸ تا ۹۶ بده و نمره‌ی کلی را معمولاً بالای ۸۰ نگه دار.',
      'فقط فقدان بنیادین (مثلاً نبود کامل روش پژوهش، نبود تحلیل داده یا نبود فهرست منابع) می‌تواند نمره‌ی یک معیار را به زیر ۷۰ برساند؛ در این حالت هم دلیل را صریح بنویس.',
      'نمره‌های ۵۰ تا ۶۰ فقط برای متنی است که بخش‌های اصلی آن واقعاً وجود ندارد؛ برای پایان‌نامه‌ی متعارف از این بازه استفاده نکن.',
      'ضعف‌ها را سازنده بنویس (مثلاً «با افزودن شاهد آماری تقویت می‌شود») بدون اینکه واقعیت متن را وارونه جلوه دهی.',
      'نمره‌ها را یکسان نکن: معیارهای قوی‌تر حتی در این حالت باید ۳ تا ۶ نمره بالاتر از معیارهای ضعیف‌تر بگیرند تا تفاوت کیفیت دیده شود.',
    ],
  },
  {
    id: 'balanced',
    label: 'متعادل',
    description: 'ارزیابی متعادل و واقع‌بینانه؛ پایان‌نامه‌ی متعارف در بازه‌ی خوب قرار می‌گیرد.',
    stance: 'داور منصف و واقع‌بین که نه ارفاق می‌کند و نه سخت‌گیری نمایشی دارد',
    expectedRange: '۷۰ تا ۸۶',
    chipClass:
      'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300',
    activeClass:
      'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-400/50 dark:bg-amber-500/15',
    guidance: [
      'در حالت متعادل داوری می‌کنی: ارزیابی واقع‌بین، بدون سخت‌گیری نمایشی و بدون تعارف.',
      'پایان‌نامه‌ی متعارف که ساختار، روش و تحلیل قابل قبول دارد معمولاً در بازه‌ی ۷۰ تا ۸۶ قرار می‌گیرد؛ نمره‌ی ۷۰ یعنی «قابل قبول و معمول»، نه «ضعیف».',
      'بازه‌ی ۶۰ تا ۶۹ را برای کاستی‌های مشخص و تکرارشونده نگه دار و بازه‌ی ۴۰ تا ۵۹ را فقط وقتی به‌کار ببر که ایرادهای جدی و متعدد در متن دیده می‌شود.',
      'از یکنواختی نمره‌ها پرهیز کن: معیارهای قوی‌تر نمره‌ی بالاتر و معیارهای ضعیف‌تر نمره‌ی پایین‌تر بگیرند تا طیف واقعی کیفیت دیده شود.',
      'هر نمره را با شاهد متن و بازه‌های بالا تطبیق بده؛ اگر نمره‌ی پیشنهادی‌ات با شاهد متن هم‌خوان نیست، نمره را اصلاح کن.',
    ],
  },
  {
    id: 'strict',
    label: 'بدبینانه',
    description: 'داوری سخت‌گیرانه با استاندارد انتشار علمی؛ کاستی‌ها بی‌ارفاق نمره‌دهی می‌شوند.',
    stance: 'داور سخت‌گیر و بدبین با استاندارد پذیرش در مجله یا همایش معتبر',
    expectedRange: '۵۵ تا ۷۵',
    chipClass:
      'inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300',
    activeClass:
      'border-rose-400 bg-rose-50 shadow-sm dark:border-rose-400/50 dark:bg-rose-500/15',
    guidance: [
      'در حالت سخت‌گیرانه (بدبینانه) داوری می‌کنی: استاندارد را در حد پذیرش در مجله یا همایش معتبر بالا ببر و کاستی‌ها را بی‌ارفاق نمره‌دهی کن.',
      'پایان‌نامه‌ی متعارف و قابل قبول در این حالت معمولاً ۶۰ تا ۷۵ می‌گیرد؛ نمره‌ی بالای ۸۵ فقط برای کار بسیار قوی و مستند است.',
      'هر بخشی که قابل ارزیابی نیست (نبود روش، نبود تحلیل، ارجاعات ناقص) نمره‌ی همان معیار را حداکثر ۵۰ بده و صریح بنویس چه چیزی غایب است.',
      'نقاط قوت را فقط وقتی بنویس که شاهد مشخص دارد؛ از تعریف کلی و اغراق‌آمیز پرهیز کن.',
      'با این حال نمره باید از شاهد متن پیروی کند: نبود یک بخش نباید نمره‌ی سایر معیارهای مستند را پایین بکشد.',
      'تفاوت کیفیت را در نمره‌ها نشان بده: معیار مستند و قوی می‌تواند بالای ۸۰ بگیرد، در حالی که معیار دارای کاستی جدی در بازه‌ی ۴۰ تا ۵۵ می‌ماند؛ همه را یک عدد نکن.',
    ],
  },
];

/** یکسان‌سازی متن برای تطبیق نام حالت (نیم‌فاصله، ی/ک عربی و فاصله‌ها) */
function normalizeKey(input: unknown): string {
  return String(input ?? '')
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** نام‌های پذیرفته‌شده برای هر حالت (فارسی و انگلیسی) */
const MODE_ALIASES: Record<string, EvaluationMode> = {
  optimistic: 'optimistic',
  lenient: 'optimistic',
  easy: 'optimistic',
  positive: 'optimistic',
  'خوش بینانه': 'optimistic',
  خوشبینانه: 'optimistic',
  'روشن بینانه': 'optimistic',
  balanced: 'balanced',
  normal: 'balanced',
  standard: 'balanced',
  neutral: 'balanced',
  fair: 'balanced',
  عادی: 'balanced',
  متعادل: 'balanced',
  معمولی: 'balanced',
  'واقع بینانه': 'balanced',
  strict: 'strict',
  pessimistic: 'strict',
  harsh: 'strict',
  severe: 'strict',
  tough: 'strict',
  'سخت گیرانه': 'strict',
  سختگیرانه: 'strict',
  بدبینانه: 'strict',
  سخت: 'strict',
};

/**
 * نسخه‌ی یکسان‌شده‌ی نام‌ها؛ کلیدهای فارسی با/بدون نیم‌فاصله را یکسان می‌کند
 * (مثلاً «خوش‌بینانه»، «خوش بینانه» و «خوشبینانه» همه به یک کلید تبدیل می‌شوند).
 */
const NORMALIZED_ALIASES: Record<string, EvaluationMode> = Object.fromEntries(
  Object.entries(MODE_ALIASES).map(([label, id]) => [normalizeKey(label), id] as const),
);

/** تبدیل هر ورودی (از کلاینت یا گزارش قدیمی) به حالت معتبر */
export function normalizeEvaluationMode(value: unknown): EvaluationMode {
  const key = normalizeKey(value);
  if (!key) return DEFAULT_EVALUATION_MODE;
  if (key === 'optimistic' || key === 'balanced' || key === 'strict') {
    return key as EvaluationMode;
  }
  return NORMALIZED_ALIASES[key] ?? DEFAULT_EVALUATION_MODE;
}

/** تعریف کامل حالت (با پیش‌فرض «متعادل» برای ورودی نامعتبر) */
export function findEvaluationMode(value: unknown): EvaluationModeDefinition {
  const id = normalizeEvaluationMode(value);
  return EVALUATION_MODES.find((mode) => mode.id === id) ?? EVALUATION_MODES[1];
}

/** برچسب فارسی حالت ارزیابی */
export function evaluationModeLabel(value: unknown): string {
  return findEvaluationMode(value).label;
}

/**
 * بلوک راهنمای حالت که به پرامپت سیستم اضافه می‌شود.
 * متن قواعد از همین فهرست خوانده می‌شود تا تعریف حالت‌ها یک‌جا بماند.
 */
export function evaluationModePrompt(value: unknown): string {
  const mode = findEvaluationMode(value);
  const rules = mode.guidance.map((rule, index) => `${index + 1}. ${rule}`).join('\n');

  return `## نوع (حالت) ارزیابی: «${mode.label}»
${mode.stance}. بازه‌ی معمول نمره‌ی کلی در این حالت ${mode.expectedRange} از ۱۰۰ است.

${rules}

این حالت فقط «میزان سخت‌گیری در نمره‌دهی و لحن گزارش» را تعیین می‌کند. قواعد الزامی داوری
(صداقت، استناد به متن، پرهیز از ساختن داده، قالب JSON و محاسبه‌ی میانگین وزنی) در همه‌ی حالت‌ها یکسان است.`;
}
