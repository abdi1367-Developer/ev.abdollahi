/**
 * نرمال‌سازی پاسخ مدل زبانی.
 *
 * مدل‌ها (خصوصاً مدل‌های رایگان) ممکن است نام معیار را کمی متفاوت بنویسند،
 * نمره را به‌صورت رشته یا با ارقام فارسی بدهند، یا یکی از معیارها را جا بیندازند.
 * این ماژول همه‌ی این حالت‌ها را به یک گزارش استاندارد و قابل اعتماد تبدیل می‌کند
 * و نمره‌ی کل را به‌صورت «میانگین وزنی» محاسبه می‌کند (نه نمره‌ی سلیقه‌ای مدل).
 */
import { CRITERIA, matchesCriterion, type CriterionDefinition } from '../criteria';
import { MIN_BULLETS, ensureReportBullets } from '../bullets';
import { polishPersianText } from '../persian';
import type { CriterionResult, EvaluationReport } from '../types';
import { AIError } from './errors';
import { parseLooseJson, stripCodeFences } from './json-recovery';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(AR_DIGITS.indexOf(digit)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(record: Record<string, unknown>, keys: string[], maxLength: number): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      // درست‌نویسی و فاصله‌گذاری فارسی اصلاح می‌شود تا کلمات در خروجی به هم نچسبند
      return polishPersianText(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
    }
  }
  return '';
}

/** تبدیل هر ورودی به آرایه‌ای از رشته‌های تمیز (پشتیبانی از آرایه‌ی اشیاء) */
export function toStringArray(value: unknown, max = 5, maxLength = 400): string[] {
  if (value === null || value === undefined) return [];

  const rawItems: unknown[] = Array.isArray(value) ? value : [value];
  const result: string[] = [];

  for (const item of rawItems) {
    let text = '';
    if (typeof item === 'string') {
      text = item;
    } else if (item && typeof item === 'object') {
      const record = asRecord(item);
      text = pickString(record, ['text', 'description', 'point', 'title', 'item', 'value'], maxLength);
    }

    // امکان جداسازی چند مورد با «؛»، خط جدید یا نشانه‌ی بولت در یک رشته
    const parts = text.split(/[؛\n•●▪◦‣]+/);
    for (const part of parts) {
      const cleaned = polishPersianText(
        // شماره‌گذاری لاتین و فارسی ابتدای آیتم حذف می‌شود («۱.»، «-»، «•»)
        part.replace(/^[-–—•*\d۰-۹.)\s]+/, ''),
      )
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 1 && !result.includes(cleaned.slice(0, maxLength))) {
        result.push(cleaned.slice(0, maxLength));
      }
      if (result.length >= max) return result;
    }
  }

  return result;
}

/**
 * اولین آرایه‌ی غیرخالی از میان چند کلید احتمالی.
 * مدل‌ها ممکن است کلیدها را فارسی یا با نام دیگری برگردانند و کلید اول را
 * خالی بگذارند؛ استفاده از `??` در این حالت آرایه‌ی خالی را برمی‌گرداند.
 */
function firstFilledArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const items = toStringArray(record[key], MIN_BULLETS + 3);
    if (items.length) return items;
  }
  return [];
}

/** تبدیل نمره‌ی مدل (عدد، رشته، درصد، ارقام فارسی) به عدد ۰ تا ۱۰۰ */
export function toScore(value: unknown): number | null {
  let numeric: number | null = null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    numeric = value;
  } else if (typeof value === 'string') {
    const match = toLatinDigits(value).replace(/٪/g, '%').match(/-?\d+(?:\.\d+)?/);
    if (match) numeric = Number(match[0]);
  }

  if (numeric === null || !Number.isFinite(numeric)) return null;
  return clampScore(numeric);
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * استخراج اولین شیء JSON از پاسخ مدل.
 * پوشش: بلوک کد ```json، متن اضافی قبل/بعد، ویرگول اضافی، گیومه‌های فارسی،
 * خط جدید خامِ داخل رشته‌ها و خروجیِ ناقص (قطع‌شده در سقف توکن).
 * جزئیات بازیابی در `lib/ai/json-recovery.ts` است.
 */
export function extractJson(raw: string): unknown {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new AIError('پاسخ مدل خالی بود.', { kind: 'invalid_output', status: 502 });
  }

  const text = stripCodeFences(raw);
  const parsed = parseLooseJson(text);
  if (parsed !== undefined) return parsed;

  // برای عیب‌یابی، انتهای خروجی (جایی که معمولاً قطع می‌شود) در لاگ سرور ثبت می‌شود
  const tail = text.slice(-240).replace(/\s+/g, ' ');
  console.warn(`[ai] خروجی مدل JSON معتبر نبود (${text.length} نویسه): …${tail}`);

  throw new AIError('پاسخ مدل ساختار JSON معتبر نداشت.', {
    kind: 'invalid_output',
    status: 502,
    detail: `length=${text.length}; tail=${tail}`,
  });
}

/** میانگین وزنی نمره‌ی معیارها (وزن‌ها از قالب ارزیابی می‌آیند) */
export function computeWeightedScore(criteria: CriterionResult[]): number {
  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  const weighted = criteria.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
  return round1(weighted);
}

/**
 * تبدیل خروجی خام مدل به `EvaluationReport` استاندارد:
 * تطبیق نام معیارها، تبدیل نمره‌ها، تکمیل معیارهای جاافتاده و محاسبه‌ی نمره‌ی کل.
 */
export function normalizeReport(
  input: unknown,
  definitions: CriterionDefinition[] = CRITERIA,
): EvaluationReport {
  const root = asRecord(input);

  let rawEntries: unknown[] = [];
  if (Array.isArray(root.criteria)) rawEntries = root.criteria;
  else if (Array.isArray(root.criteria_scores)) rawEntries = root.criteria_scores;
  else if (Array.isArray(root.scores)) rawEntries = root.scores;
  else if (root.scores && typeof root.scores === 'object') {
    rawEntries = Object.entries(root.scores as Record<string, unknown>).map(([name, score]) => ({ name, score }));
  }

  const entries = rawEntries.map(asRecord).filter((entry) => Object.keys(entry).length > 0);
  if (!entries.length) {
    throw new AIError('مدل هیچ معیاری را ارزیابی نکرد؛ گزارش قابل استفاده نیست.', {
      kind: 'invalid_output',
      status: 502,
    });
  }

  const nameOf = (entry: Record<string, unknown>): string =>
    String(entry.name ?? entry.criterion ?? entry.title ?? entry.key ?? entry.label ?? '');

  // تطبیق هر معیار استاندارد با یکی از ورودی‌های مدل (بدون استفاده‌ی دوباره از یک ورودی)
  const usedIndexes = new Set<number>();
  const matched: Array<number | null> = definitions.map((definition) => {
    const index = entries.findIndex(
      (entry, i) => !usedIndexes.has(i) && matchesCriterion(nameOf(entry), definition),
    );
    if (index === -1) return null;
    usedIndexes.add(index);
    return index;
  });

  if (matched.every((index) => index === null)) {
    throw new AIError('نام معیارهای بازگشتی مدل با معیارهای سامانه هم‌خوانی نداشت.', {
      kind: 'invalid_output',
      status: 502,
      detail: entries.map(nameOf).join(' | ').slice(0, 300),
    });
  }

  const rawScores = matched.map((index) => {
    if (index === null) return null;
    const entry = entries[index];
    return toScore(entry.score ?? entry.value ?? entry.rating ?? entry.points ?? entry.grade);
  });

  const validRaw = rawScores.filter((score): score is number => score !== null);
  // اگر همه‌ی نمره‌ها ≤ ۱۰ باشند، مدل از مقیاس ۱۰ استفاده کرده است
  const scale = validRaw.length > 0 && Math.max(...validRaw) <= 10 ? 10 : 1;
  const validScores = validRaw.map((score) => clampScore(score * scale));
  const average = validScores.length
    ? round1(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
    : 50;

  const criteria: CriterionResult[] = definitions.map((definition, i) => {
    const index = matched[i];

    if (index === null) {
      return {
        name: definition.name,
        score: average,
        weight: definition.weight,
        reasoning:
          'مدل برای این معیار پاسخی برنگرداند؛ نمره‌ی میانگین سایر معیارها به‌صورت محافظه‌کارانه اعمال شده است و بهتر است این بخش به‌صورت دستی بازبینی شود.',
        strengths: [],
        weaknesses: ['این معیار در پاسخ مدل ارزیابی نشده است.'],
      };
    }

    const entry = entries[index];
    // کلیدهای متعدد (فارسی و انگلیسی) بررسی می‌شوند تا آرایه‌ی خالی باعث
    // خالی‌ماندن بخش «نقاط قوت/ضعف» نشود.
    const strengths = firstFilledArray(entry, [
      'strengths',
      'strength',
      'pros',
      'positives',
      'points_for',
      'merits',
      'advantages',
      'نقاط قوت',
      'نقاط_قوت',
    ]);
    const weaknesses = firstFilledArray(entry, [
      'weaknesses',
      'weakness',
      'cons',
      'issues',
      'gaps',
      'improvements',
      'drawbacks',
      'limitations',
      'flaws',
      'نقاط ضعف',
      'نقاط_ضعف',
      'نقاط قابل بهبود',
      'نقاط_قابل_بهبود',
    ]);

    let reasoning = pickString(
      entry,
      ['reasoning', 'analysis', 'explanation', 'justification', 'comment', 'assessment', 'why'],
      2000,
    );
    if (!reasoning) {
      const parts: string[] = [];
      if (strengths.length) parts.push(`نقاط قوت: ${strengths.join('؛ ')}`);
      if (weaknesses.length) parts.push(`نقاط ضعف: ${weaknesses.join('؛ ')}`);
      reasoning = parts.join(' — ') || 'مدل برای این معیار توضیحی ارائه نکرد.';
    }

    const rawScore = rawScores[i];
    return {
      name: definition.name,
      score: rawScore === null ? average : clampScore(rawScore * scale),
      weight: definition.weight,
      reasoning,
      strengths,
      weaknesses,
    };
  });

  const overallScore = computeWeightedScore(criteria);

  let summary = pickString(
    root,
    ['summary', 'overall_assessment', 'general_assessment', 'conclusion', 'overall'],
    3000,
  );
  if (!summary) {
    const weakest = [...criteria].sort((a, b) => a.score - b.score).slice(0, 2);
    summary = `میانگین وزنی ارزیابی ${overallScore} از ۱۰۰ است. ضعیف‌ترین حوزه‌ها: ${weakest
      .map((item) => `${item.name} (${item.score})`)
      .join(' و ')}.`;
  }

  let recommendations = toStringArray(
    root.top_recommendations ?? root.recommendations ?? root.suggestions,
    8,
    500,
  );
  if (!recommendations.length) {
    const weakest = [...criteria].sort((a, b) => a.score - b.score).slice(0, 3);
    recommendations = weakest.map((item) =>
      item.weaknesses[0]
        ? `تقویت «${item.name}»: ${item.weaknesses[0]}`
        : `بازنگری و تقویت «${item.name}» با توجه به بازخورد ارائه‌شده.`,
    );
  }

  // تضمین حداقل ۵ نقطه قوت و ۵ نقطه ضعف برای هر معیار (حتی اگر مدل کمتر داده باشد)
  return ensureReportBullets({
    overall_score: overallScore,
    criteria,
    summary,
    top_recommendations: recommendations,
  });
}
