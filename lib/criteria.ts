/**
 * هشت معیار ارزیابی پایان‌نامه به‌همراه وزن هر معیار.
 * این فایل «منبع حقیقت» است: هم برای ساخت پرامپت هوش مصنوعی استفاده می‌شود
 * و هم برای نرمال‌سازی پاسخ مدل (اگر مدل نام معیار را متفاوت بنویسد).
 */
export interface CriterionDefinition {
  key: string;
  name: string;
  /** وزن به درصد — جمع همه وزن‌ها باید ۱۰۰ باشد */
  weight: number;
  /** توضیح معیار؛ هم در پرامپت هوش مصنوعی و هم در راهنمای رابط کاربری استفاده می‌شود */
  description: string;
  /** کلیدواژه‌هایی برای تشخیص معیار در پاسخ مدل */
  aliases: string[];
}

export const CRITERIA: CriterionDefinition[] = [
  {
    key: 'originality',
    name: 'اصالت و نوآوری',
    weight: 15,
    description:
      'تازگی موضوع، تمایز پژوهش از کارهای پیشین و میزان سهم علمی/کاربردی آن نسبت به ادبیات موجود.',
    aliases: ['اصالت', 'نوآوری', 'نواوری', 'originality', 'innovation'],
  },
  {
    key: 'literature',
    name: 'مرور ادبیات و پیشینه پژوهش',
    weight: 10,
    description:
      'عمق و به‌روز بودن مرور پیشینه، پوشش منابع داخلی و خارجی و پیوند منطقی آن با مسئله‌ی پژوهش.',
    aliases: ['مرور ادبیات', 'پیشینه پژوهش', 'پیشینه', 'ادبیات', 'literature', 'background'],
  },
  {
    key: 'problem',
    name: 'وضوح بیان مسئله و اهداف',
    weight: 10,
    description:
      'روشن بودن مسئله و شکاف پژوهشی، ضرورت انجام پژوهش و انسجام اهداف، سؤالات و فرضیه‌ها.',
    aliases: ['بیان مسئله', 'مسئله', 'اهداف', 'هدف', 'problem statement', 'objective'],
  },
  {
    key: 'methodology',
    name: 'متدولوژی و روش پژوهش',
    weight: 20,
    description:
      'تناسب روش پژوهش با مسئله، دقت در جامعه و نمونه، ابزار گردآوری داده، روایی/پایایی و قابلیت تکرار.',
    aliases: ['متدولوژی', 'روش پژوهش', 'روش تحقیق', 'روش‌شناسی', 'methodology', 'research method'],
  },
  {
    key: 'results',
    name: 'تحلیل داده‌ها و نتایج',
    weight: 15,
    description:
      'کیفیت تحلیل داده‌ها، تناسب آزمون‌ها و شاخص‌ها، شفافیت جداول/نمودارها و پاسخ صریح به سؤالات پژوهش.',
    aliases: ['تحلیل داده', 'داده‌ها', 'نتایج', 'یافته‌ها', 'analysis', 'results'],
  },
  {
    key: 'discussion',
    name: 'بحث و نتیجه‌گیری',
    weight: 10,
    description:
      'تفسیر یافته‌ها، مقایسه با پیشینه، استخراج نتیجه‌گیری منطقی و بیان محدودیت‌ها و پیشنهادهای آینده.',
    aliases: ['بحث', 'نتیجه‌گیری', 'نتیجه گیری', 'discussion', 'conclusion'],
  },
  {
    key: 'writing',
    name: 'کیفیت نگارش و ساختار',
    weight: 10,
    description:
      'ساختار استاندارد فصل‌ها، انسجام و روانی نگارش، رعایت آیین نگارش فارسی و کیفیت جداول و شکل‌ها.',
    aliases: ['نگارش', 'ساختار', 'ویرایش', 'writing', 'structure'],
  },
  {
    key: 'references',
    name: 'منابع و ارجاعات',
    weight: 10,
    description:
      'درستی و کامل بودن ارجاعات درون‌متنی، هم‌خوانی آن‌ها با فهرست منابع و اعتبار و تنوع منابع.',
    aliases: ['منابع', 'ارجاعات', 'مراجع', 'references', 'citations'],
  },
];

/** جمع وزن‌ها (برای محاسبه میانگین وزنی) */
export const TOTAL_WEIGHT = CRITERIA.reduce((sum, c) => sum + c.weight, 0);

/** نرمال‌سازی متن برای مقایسه: حذف نیم‌فاصله، یکسان‌سازی ی/ک و فاصله‌ها */
export function normalizeFa(input: string): string {
  return String(input ?? '')
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** آیا این نام معیار مربوط به تعریف داده‌شده است؟ */
export function matchesCriterion(rawName: string, def: CriterionDefinition): boolean {
  const name = normalizeFa(rawName);
  if (!name) return false;
  const canonical = normalizeFa(def.name);
  if (name === canonical || name.includes(canonical) || canonical.includes(name)) return true;
  return def.aliases.some((alias) => {
    const a = normalizeFa(alias);
    return a.length > 2 && name.includes(a);
  });
}
