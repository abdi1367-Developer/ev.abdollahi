/**
 * قالب‌های ارزیابی (Rubric Templates)
 *
 * هر قالب مجموعه‌ای از معیارها با نام و وزن قابل تنظیم است. قالب پیش‌فرض
 * همان هشت معیار قبلی است؛ قالب‌های رشته‌ای و قالب‌های ساخته‌شده توسط کاربر
 * هم از همین ساختار استفاده می‌کنند.
 *
 * این فایل باید فقط به تایپ‌ها و توابع خالص وابسته بماند تا هم در کلاینت
 * و هم در Route Handlerها قابل استفاده باشد.
 */
import { CRITERIA, normalizeFa, type CriterionDefinition } from './criteria';
import type { TemplateCriterion, TemplateSnapshot } from './types';

export interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  criteria: CriterionDefinition[];
  builtIn: boolean;
}

export const DEFAULT_TEMPLATE_ID = 'default';
export const MIN_CRITERIA = 1;
export const MAX_CRITERIA = 20;

/** کپی عمیق معیارها تا ویرایش قالب، منبع پیش‌فرض را تغییر ندهد */
export function cloneCriteria(criteria: CriterionDefinition[]): CriterionDefinition[] {
  return criteria.map((criterion) => ({
    ...criterion,
    aliases: [...(criterion.aliases ?? [])],
  }));
}

function builtInTemplate(
  id: string,
  name: string,
  description: string,
  criteria: CriterionDefinition[],
): EvaluationTemplate {
  return { id, name, description, criteria: cloneCriteria(criteria), builtIn: true };
}

const HUMANITIES_CRITERIA: CriterionDefinition[] = [
  {
    key: 'originality',
    name: 'اصالت و نوآوری',
    weight: 12,
    description: 'تازگی موضوع، تمایز از پیشینه و سهم نظری یا کاربردی پژوهش.',
    aliases: ['اصالت', 'نوآوری', 'originality'],
  },
  {
    key: 'literature',
    name: 'مرور ادبیات و پیشینه',
    weight: 12,
    description: 'عمق، به‌روزبودن و پیوند منطقی پیشینه با مسئله‌ی پژوهش.',
    aliases: ['پیشینه', 'ادبیات', 'literature'],
  },
  {
    key: 'problem',
    name: 'بیان مسئله و اهداف',
    weight: 10,
    description: 'روشن بودن شکاف پژوهشی، ضرورت، اهداف و سؤالات پژوهش.',
    aliases: ['بیان مسئله', 'اهداف', 'problem'],
  },
  {
    key: 'methodology',
    name: 'روش‌شناسی پژوهش',
    weight: 15,
    description: 'تناسب روش کیفی/کمی/آمیخته با مسئله، جامعه، نمونه و ابزار گردآوری داده.',
    aliases: ['روش پژوهش', 'متدولوژی', 'methodology'],
  },
  {
    key: 'results',
    name: 'تحلیل داده‌ها و یافته‌ها',
    weight: 12,
    description: 'شفافیت فرایند تحلیل، استناد به داده‌ها و انسجام یافته‌ها با سؤالات پژوهش.',
    aliases: ['تحلیل داده', 'یافته‌ها', 'results'],
  },
  {
    key: 'discussion',
    name: 'بحث و نتیجه‌گیری',
    weight: 12,
    description: 'تفسیر یافته‌ها، مقایسه با پیشینه، محدودیت‌ها و پیشنهادهای آینده.',
    aliases: ['بحث', 'نتیجه‌گیری', 'discussion'],
  },
  {
    key: 'writing',
    name: 'نگارش و ساختار',
    weight: 9,
    description: 'ساختار فصل‌ها، انسجام متن و رعایت آیین نگارش فارسی.',
    aliases: ['نگارش', 'ساختار', 'writing'],
  },
  {
    key: 'references',
    name: 'منابع و ارجاعات',
    weight: 8,
    description: 'درستی ارجاعات درون‌متنی، هم‌خوانی با فهرست منابع و اعتبار منابع.',
    aliases: ['منابع', 'ارجاعات', 'references'],
  },
  {
    key: 'ethics',
    name: 'ملاحظات اخلاقی پژوهش',
    weight: 10,
    description: 'رضایت آگاهانه، محرمانگی، امانت‌داری علمی و رعایت اصول کمیته‌ی اخلاق.',
    aliases: ['اخلاق پژوهش', 'اخلاق', 'ethics'],
  },
];

const ENGINEERING_CRITERIA: CriterionDefinition[] = [
  {
    key: 'originality',
    name: 'اصالت و نوآوری فنی',
    weight: 10,
    description: 'تمایز راه‌حل پیشنهادی از کارهای پیشین و میزان نوآوری فنی.',
    aliases: ['اصالت', 'نوآوری', 'originality'],
  },
  {
    key: 'literature',
    name: 'مرور پیشینه و کارهای مرتبط',
    weight: 8,
    description: 'پوشش منابع معتبر، کارهای مرتبط و مقایسه‌ی روش‌ها.',
    aliases: ['پیشینه', 'کارهای مرتبط', 'literature'],
  },
  {
    key: 'problem',
    name: 'تعریف مسئله و نیازها',
    weight: 8,
    description: 'وضوح مسئله، نیازمندی‌ها، محدودیت‌ها و معیارهای موفقیت.',
    aliases: ['بیان مسئله', 'نیازمندی', 'problem'],
  },
  {
    key: 'methodology',
    name: 'روش‌شناسی و طراحی پژوهش',
    weight: 16,
    description: 'انسجام معماری/روش، تعریف متغیرها، ابزار سنجش و قابلیت تکرار.',
    aliases: ['روش پژوهش', 'متدولوژی', 'design'],
  },
  {
    key: 'results',
    name: 'پیاده‌سازی، آزمون و نتایج',
    weight: 18,
    description: 'کیفیت پیاده‌سازی، طراحی آزمایش، اعتبارسنجی و تحلیل نتایج.',
    aliases: ['پیاده‌سازی', 'نتایج', 'evaluation'],
  },
  {
    key: 'discussion',
    name: 'تحلیل، بحث و مقایسه',
    weight: 8,
    description: 'تفسیر نتایج، مقایسه با روش‌های رقیب و بیان محدودیت‌ها.',
    aliases: ['بحث', 'مقایسه', 'discussion'],
  },
  {
    key: 'writing',
    name: 'ساختار و کیفیت ارائه',
    weight: 7,
    description: 'سازمان فصل‌ها، کیفیت شکل‌ها و جداول و وضوح ارائه‌ی فنی.',
    aliases: ['نگارش', 'ارائه', 'writing'],
  },
  {
    key: 'references',
    name: 'منابع و ارجاعات',
    weight: 7,
    description: 'دقت ارجاعات، اعتبار منابع و هم‌خوانی با فهرست مراجع.',
    aliases: ['منابع', 'ارجاعات', 'references'],
  },
  {
    key: 'impact',
    name: 'کاربردپذیری و اثر عملی',
    weight: 18,
    description: 'امکان به‌کارگیری صنعتی، مقیاس‌پذیری، هزینه و ارزش عملی نتایج.',
    aliases: ['کاربرد', 'اثر عملی', 'impact'],
  },
];

const MEDICAL_CRITERIA: CriterionDefinition[] = [
  {
    key: 'originality',
    name: 'اصالت و اهمیت بالینی',
    weight: 10,
    description: 'تازگی سؤال پژوهش و اهمیت بالینی یا سلامت عمومی نتایج.',
    aliases: ['اصالت', 'اهمیت بالینی', 'originality'],
  },
  {
    key: 'literature',
    name: 'مرور پیشینه و شواهد',
    weight: 10,
    description: 'پوشش نظام‌مند شواهد، منابع معتبر و پیوند با دانش موجود.',
    aliases: ['پیشینه', 'شواهد', 'literature'],
  },
  {
    key: 'problem',
    name: 'بیان مسئله و فرضیه‌ها',
    weight: 10,
    description: 'وضوح مسئله، جمعیت هدف، اهداف و فرضیه‌های قابل آزمون.',
    aliases: ['بیان مسئله', 'فرضیه', 'hypothesis'],
  },
  {
    key: 'methodology',
    name: 'روش‌شناسی و طراحی مطالعه',
    weight: 20,
    description: 'تناسب طراحی مطالعه، نمونه‌گیری، ابزارها، کورسازی و کنترل سوگیری.',
    aliases: ['روش پژوهش', 'طراحی مطالعه', 'methodology'],
  },
  {
    key: 'results',
    name: 'تحلیل آماری و نتایج',
    weight: 18,
    description: 'درستی آزمون‌ها، شاخص‌های اثر، جداول و پاسخ به فرضیه‌ها.',
    aliases: ['تحلیل آماری', 'نتایج', 'statistics'],
  },
  {
    key: 'discussion',
    name: 'بحث، نتیجه‌گیری و محدودیت‌ها',
    weight: 10,
    description: 'تفسیر بالینی، مقایسه با شواهد و بیان محدودیت‌ها.',
    aliases: ['بحث', 'نتیجه‌گیری', 'discussion'],
  },
  {
    key: 'writing',
    name: 'نگارش و ساختار گزارش',
    weight: 7,
    description: 'رعایت ساختار مقاله/پایان‌نامه و وضوح گزارش علمی.',
    aliases: ['نگارش', 'ساختار', 'writing'],
  },
  {
    key: 'references',
    name: 'منابع و ارجاعات',
    weight: 7,
    description: 'دقت ارجاعات، کیفیت منابع و هم‌خوانی با فهرست مراجع.',
    aliases: ['منابع', 'ارجاعات', 'references'],
  },
  {
    key: 'ethics',
    name: 'اخلاق و ایمنی پژوهش',
    weight: 8,
    description: 'کد اخلاق، رضایت آگاهانه، محرمانگی داده و مدیریت خطر.',
    aliases: ['اخلاق', 'ایمنی', 'ethics'],
  },
];

const MANAGEMENT_CRITERIA: CriterionDefinition[] = [
  {
    key: 'problem',
    name: 'بیان مسئله و اهداف',
    weight: 10,
    description: 'روشن بودن مسئله‌ی مدیریتی، شکاف پژوهشی، اهداف و سؤالات پژوهش.',
    aliases: ['بیان مسئله', 'اهداف', 'problem'],
  },
  {
    key: 'literature',
    name: 'مبانی نظری و پیشینه',
    weight: 12,
    description: 'انسجام چارچوب نظری با مسئله و کیفیت مرور پژوهش‌های پیشین.',
    aliases: ['مبانی نظری', 'پیشینه', 'literature'],
  },
  {
    key: 'methodology',
    name: 'روش‌شناسی پژوهش',
    weight: 14,
    description: 'تناسب روش، جامعه، نمونه، ابزار و فرایند گردآوری داده با سؤال پژوهش.',
    aliases: ['روش پژوهش', 'متدولوژی', 'methodology'],
  },
  {
    key: 'analysis',
    name: 'تحلیل داده و یافته‌ها',
    weight: 14,
    description: 'درستی تحلیل، شفافیت یافته‌ها و پیوند آن‌ها با سؤالات پژوهش.',
    aliases: ['تحلیل داده', 'یافته‌ها', 'analysis'],
  },
  {
    key: 'innovation',
    name: 'نوآوری و سهم علمی',
    weight: 10,
    description: 'تمایز پژوهش از پیشینه و ارائه‌ی بینش یا راهکار تازه.',
    aliases: ['نوآوری', 'سهم علمی', 'innovation'],
  },
  {
    key: 'practice',
    name: 'کاربرد مدیریتی و اثر عملی',
    weight: 12,
    description: 'قابلیت استفاده از یافته‌ها در تصمیم‌گیری، سیاست‌گذاری یا عمل سازمانی.',
    aliases: ['کاربرد', 'اثر عملی', 'practice'],
  },
  {
    key: 'structure',
    name: 'ساختار و نگارش',
    weight: 8,
    description: 'انسجام فصل‌ها، وضوح بیان و رعایت آیین نگارش علمی.',
    aliases: ['نگارش', 'ساختار', 'writing'],
  },
  {
    key: 'references',
    name: 'منابع و ارجاعات',
    weight: 8,
    description: 'درستی ارجاعات، هم‌خوانی با فهرست منابع و اعتبار منابع.',
    aliases: ['منابع', 'ارجاعات', 'references'],
  },
  {
    key: 'ethics',
    name: 'اخلاق و اعتبار پژوهش',
    weight: 12,
    description: 'رعایت امانت‌داری علمی، محرمانگی داده و ملاحظات اخلاقی پژوهش.',
    aliases: ['اخلاق', 'اعتبار', 'ethics'],
  },
];

export const BUILT_IN_TEMPLATES: EvaluationTemplate[] = [
  builtInTemplate(
    DEFAULT_TEMPLATE_ID,
    'عمومی',
    'قالب عمومی داوری پایان‌نامه با هشت معیار و وزن‌های متعارف.',
    CRITERIA,
  ),
  builtInTemplate(
    'management',
    'مدیریت',
    'قالب ۹ معیاری با تأکید بر مسئله‌ی مدیریتی، تحلیل داده و اثر عملی.',
    MANAGEMENT_CRITERIA,
  ),
  builtInTemplate(
    'humanities',
    'علوم انسانی و اجتماعی',
    'قالب ۹ معیاری با تأکید بر روش‌شناسی کیفی/کمی و ملاحظات اخلاقی.',
    HUMANITIES_CRITERIA,
  ),
  builtInTemplate(
    'engineering',
    'مهندسی و فناوری',
    'قالب ۹ معیاری با وزن بالاتر برای پیاده‌سازی، آزمون و اثر عملی.',
    ENGINEERING_CRITERIA,
  ),
  builtInTemplate(
    'medical',
    'علوم پزشکی و سلامت',
    'قالب ۹ معیاری با تأکید بر طراحی مطالعه، تحلیل آماری و اخلاق پژوهش.',
    MEDICAL_CRITERIA,
  ),
];

export const DEFAULT_TEMPLATE: EvaluationTemplate =
  BUILT_IN_TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID) ??
  BUILT_IN_TEMPLATES[0];

export function findBuiltInTemplate(id: string): EvaluationTemplate | null {
  return BUILT_IN_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function sumCriteriaWeights(criteria: Array<{ weight: number }>): number {
  return Math.round(criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) * 10) / 10;
}

/** ساخت نسخه‌ی قابل ذخیره از قالب (بدون کلیدواژه‌های داخلی) */
export function toTemplateSnapshot(template: {
  id: string;
  name: string;
  criteria: Array<{ name: string; weight: number; description?: string }>;
}): TemplateSnapshot {
  return {
    id: String(template.id || DEFAULT_TEMPLATE_ID).slice(0, 80),
    name: String(template.name || 'قالب ارزیابی').trim().slice(0, 120),
    criteria: template.criteria.map((criterion) => ({
      name: String(criterion.name || '').trim().slice(0, 120),
      weight: roundWeight(criterion.weight),
      ...(criterion.description
        ? { description: String(criterion.description).slice(0, 800) }
        : {}),
    })),
  };
}

function roundWeight(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.max(0, Math.min(100, numeric)) * 10) / 10;
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export interface TemplateValidationResult {
  /** قالب پاک‌سازی‌شده؛ در صورت خطا null است */
  template: EvaluationTemplate | null;
  errors: string[];
}

/**
 * اعتبارسنجی قالب دریافتی از کلاینت.
 * وزن‌ها لازم نیست دقیقاً ۱۰۰ باشند؛ نمره‌ی نهایی در سرور بر مجموع وزن‌ها
 * تقسیم می‌شود. با این حال مجموع باید بزرگ‌تر از صفر باشد.
 */
export function resolveTemplateInput(input: unknown): TemplateValidationResult {
  if (input === undefined || input === null) {
    return { template: DEFAULT_TEMPLATE, errors: [] };
  }

  if (!input || typeof input !== 'object') {
    return { template: null, errors: ['قالب ارزیابی معتبر نیست.'] };
  }

  const raw = input as Record<string, unknown>;
  const rawCriteria = Array.isArray(raw.criteria) ? raw.criteria : [];
  const errors: string[] = [];

  if (rawCriteria.length < MIN_CRITERIA) {
    errors.push('قالب ارزیابی باید حداقل یک معیار داشته باشد.');
  }
  if (rawCriteria.length > MAX_CRITERIA) {
    errors.push(`تعداد معیارهای قالب نمی‌تواند بیش از ${MAX_CRITERIA} باشد.`);
  }

  const criteria: CriterionDefinition[] = [];
  const seen = new Set<string>();

  rawCriteria.forEach((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const name = cleanText(record.name ?? record.title, 120);
    const weight = roundWeight(record.weight);
    const description = cleanText(record.description, 800);

    if (!name || name.length < 2) {
      errors.push(`نام معیار ${index + 1} باید حداقل ۲ کاراکتر باشد.`);
      return;
    }

    const normalized = normalizeFa(name);
    if (seen.has(normalized)) {
      errors.push(`نام معیار «${name}» تکراری است.`);
      return;
    }
    seen.add(normalized);

    if (!Number.isFinite(Number(record.weight)) || weight <= 0) {
      errors.push(`وزن معیار «${name}» باید بزرگ‌تر از صفر باشد.`);
      return;
    }

    const key = `criterion-${index + 1}`;
    criteria.push({
      key,
      name,
      weight,
      description: description || name,
      aliases: [],
    });
  });

  if (criteria.length > 0 && sumCriteriaWeights(criteria) <= 0) {
    errors.push('مجموع وزن معیارها باید بزرگ‌تر از صفر باشد.');
  }

  if (errors.length > 0) return { template: null, errors };

  const id = cleanText(raw.id, 80) || `custom-${Date.now().toString(36)}`;
  const name = cleanText(raw.name, 120) || 'قالب سفارشی';

  return {
    template: {
      id,
      name,
      description: cleanText(raw.description, 300) || 'قالب ارزیابی سفارشی',
      criteria,
      builtIn: false,
    },
    errors: [],
  };
}

/** بررسی سریع معیارها برای ذخیره‌ی قالب در مرورگر */
export function isUsableTemplate(template: unknown): template is EvaluationTemplate {
  if (!template || typeof template !== 'object') return false;
  const record = template as Partial<EvaluationTemplate>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    Array.isArray(record.criteria) &&
    record.criteria.length > 0 &&
    record.criteria.every(
      (criterion) =>
        criterion &&
        typeof criterion.name === 'string' &&
        Number.isFinite(Number(criterion.weight)) &&
        Number(criterion.weight) > 0,
    )
  );
}

/** ساخت معیار خالی برای ویرایشگر */
export function createEmptyCriterion(index: number): CriterionDefinition {
  return {
    key: `custom-${Date.now().toString(36)}-${index}`,
    name: '',
    weight: 10,
    description: '',
    aliases: [],
  };
}

export type { TemplateCriterion };
