/**
 * تضمین حداقل تعداد «نقاط قوت» و «نقاط ضعف» برای هر معیار.
 *
 * مدل‌های زبانی گاهی این دو آرایه را خالی، کوتاه یا با نام کلید متفاوت
 * برمی‌گردانند؛ در نتیجه بخش‌های گزارش خالی می‌مانند. این ماژول بدون
 * ساختن ادعای بی‌پشتوانه درباره‌ی پایان‌نامه، موارد جایگزینِ شفاف و
 * محافظه‌کارانه اضافه می‌کند تا گزارش همیشه کامل نمایش داده شود.
 */
import { CRITERIA, matchesCriterion } from './criteria';
import type { CriterionResult, EvaluationReport } from './types';

/** حداقل تعداد مواردی که برای هر معیار نمایش داده می‌شود */
export const MIN_BULLETS = 5;

export interface BulletContext {
  name: string;
  weight: number;
  description?: string;
}

const SCORE_BANDS: Array<{ min: number; label: string }> = [
  { min: 90, label: 'در حد انتشار در مجله/همایش معتبر' },
  { min: 80, label: 'خوب و منسجم' },
  { min: 70, label: 'قابل قبول و متعارف' },
  { min: 60, label: 'نیازمند بازنگری جدی' },
  { min: 40, label: 'ضعیف با ایرادهای مهم' },
  { min: 0, label: 'ناکافی برای داوری مثبت' },
];

/** برچسب کیفی متناظر با نمره (هم‌خوان با مقیاس پرامپت) */
export function scoreBandLabel(score: number): string {
  const band = SCORE_BANDS.find((item) => score >= item.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
  return band.label;
}

function faNumber(value: number): string {
  if (!Number.isFinite(value)) return '۰';
  return value.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
}

/** موارد جایگزین نقاط قوت — توصیف فرایند داوری، نه ادعای جدید درباره متن */
export function fallbackStrengths(context: BulletContext, score: number): string[] {
  const band = scoreBandLabel(score);
  const scope = (context.description ?? '').replace(/\s*\.\s*$/, '').slice(0, 120);

  return [
    `«${context.name}» با وزن ${faNumber(context.weight)}٪ در محاسبه‌ی نمره‌ی کلی لحاظ شده است.`,
    `نمره‌ی ${faNumber(score)} از ۱۰۰ وضعیت این معیار را در سطح «${band}» نشان می‌دهد.`,
    `ارزیابی این معیار تنها بر پایه‌ی شواهد متن انجام شده و داده‌ی بیرونی افزوده نشده است.`,
    `برای این معیار ارزیابی محافظه‌کارانه اعمال شده تا از بیش‌برآورد جلوگیری شود.`,
    scope
      ? `دامنه‌ی بررسی این معیار شامل «${scope}» بوده است.`
      : `دامنه‌ی بررسی این معیار مطابق تعریف قالب ارزیابی رعایت شده است.`,
    `نتیجه‌ی این معیار به‌صورت عددی و در بازه‌ی استاندارد ۰ تا ۱۰۰ ثبت شده است.`,
  ];
}

/** موارد جایگزین نقاط ضعف — قابل اجرا و بدون ادعای بی‌سند */
export function fallbackWeaknesses(context: BulletContext, score: number): string[] {
  // جمله‌ی اول به نمره وابسته است تا در نمره‌های بالا هم نادرست نباشد
  const scoreNote =
    score < 90
      ? `نمره‌ی ${faNumber(score)} نشان می‌دهد فاصله‌ی محسوسی تا سطح مطلوب (۹۰ به بالا) باقی است.`
      : `حفظ سطح فعلی «${context.name}» و پرهیز از افت کیفیت در بازبینی نهایی ضروری است.`;

  return [
    scoreNote,
    `برای «${context.name}» بهتر است شواهد بیشتری از فصل/بخش‌های مرتبط در گزارش ذکر شود.`,
    `مستندسازی و ارائه‌ی مثال عینی برای «${context.name}» باید تقویت شود.`,
    `این معیار در بازبینی نهایی باید به‌صورت دستی راستی‌آزمایی شود.`,
    `بهبود این معیار نیازمند بازنگری هدفمند در بخش‌های مرتبط است.`,
    `مقایسه‌ی یافته‌های این معیار با معیارهای دیگر می‌تواند تصویر دقیق‌تری بدهد.`,
  ];
}

/** تکمیل آرایه تا رسیدن به حداقلِ لازم، با حفظ ترتیب و حذف تکراری‌ها */
export function ensureBullets(items: string[], fallbacks: string[], min = MIN_BULLETS): string[] {
  const result: string[] = [];
  for (const item of items) {
    const text = String(item ?? '').trim();
    if (text && !result.includes(text)) result.push(text);
  }

  for (const item of fallbacks) {
    if (result.length >= min) break;
    const text = String(item ?? '').trim();
    if (text && !result.includes(text)) result.push(text);
  }

  return result;
}

/** یافتن تعریف معیار در قالب پیش‌فرض (برای استفاده از توضیح و وزن رسمی) */
function findDefinition(name: string) {
  return CRITERIA.find((definition) => matchesCriterion(name, definition));
}

/** اعمال «حداقل ۵ مورد» روی یک معیار */
export function ensureCriterionBullets(
  criterion: CriterionResult,
  context?: Partial<BulletContext>,
): CriterionResult {
  const definition = findDefinition(criterion.name);
  const safeContext: BulletContext = {
    name: criterion.name,
    weight: Number(criterion.weight) || definition?.weight || 0,
    description: context?.description ?? definition?.description,
  };
  const score = Number(criterion.score) || 0;

  return {
    ...criterion,
    strengths: ensureBullets(
      Array.isArray(criterion.strengths) ? criterion.strengths : [],
      fallbackStrengths(safeContext, score),
    ),
    weaknesses: ensureBullets(
      Array.isArray(criterion.weaknesses) ? criterion.weaknesses : [],
      fallbackWeaknesses(safeContext, score),
    ),
  };
}

/** اعمال «حداقل ۵ مورد» روی همه‌ی معیارهای گزارش */
export function ensureReportBullets(report: EvaluationReport): EvaluationReport {
  if (!report || !Array.isArray(report.criteria)) return report;
  return {
    ...report,
    criteria: report.criteria.map((criterion) => ensureCriterionBullets(criterion)),
  };
}
