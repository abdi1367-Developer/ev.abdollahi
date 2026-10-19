/**
 * بازیابی JSON از خروجی مدل زبانی.
 *
 * مدل‌ها (خصوصاً وقتی خروجی به سقف توکن می‌رسد) ممکن است:
 *   • JSON را داخل بلوک کد یا میان متن اضافی برگردانند،
 *   • در انتهای خروجی وسط یک رشته یا آرایه قطع شوند،
 *   • کاراکتر کنترلی خام (خط جدید یا تب) داخل رشته بگذارند،
 *   • ویرگول اضافی یا گیومه‌ی فارسی داشته باشند.
 *
 * این ماژول ابتدا با کمترین تغییر (JSON خالص) تلاش می‌کند و سپس به‌تدریج
 * حالت‌های خراب‌تر را پوشش می‌دهد؛ آخرین مرحله، «بستن» ساختار ناقص است تا
 * گزارش تا حد ممکن از خروجی نیمه‌کاره بازیابی شود.
 */

/** ساختار براکت‌ها و رشته‌های یک متن JSON */
export interface JsonStructure {
  /** آیا در انتهای متن داخل یک رشته‌ی باز هستیم */
  inString: boolean;
  /** براکت‌های باز، از درونی‌ترین به بیرونی‌ترین (کاراکتر بستن هر کدام) */
  openClosers: string[];
  /** اندیسِ بعد از هر } یا ] که خارج از رشته بسته شده است */
  closedAt: number[];
}

/** پیمایش متن و ثبت وضعیت رشته‌ها/براکت‌ها (بدون تفسیر مقادیر) */
export function scanJsonStructure(text: string): JsonStructure {
  const openClosers: string[] = [];
  const closedAt: number[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') openClosers.push('}');
    else if (char === '[') openClosers.push(']');
    else if (char === '}' || char === ']') {
      openClosers.pop();
      closedAt.push(index + 1);
    }
  }

  return { inString, openClosers, closedAt };
}

/** حذف حصار کد Markdown و BOM از ابتدا/انتهای پاسخ مدل */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/^\s*```[a-zA-Z]*\s*/, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

/** گیومه‌های تایپوگرافی را فقط در جای «کلید» به " تبدیل می‌کند تا متن مقادیر خراب نشود */
function fixCurlyQuotedKeys(text: string): string {
  return text.replace(/([{,]\s*)[\u201c\u201d]([^\u201c\u201d"]{1,80})[\u201c\u201d](\s*:)/g, '$1"$2"$3');
}

/** خط جدید/تبِ خامِ داخل رشته‌ها را escape می‌کند (این کاراکترها JSON را نامعتبر می‌کنند) */
function escapeControlCharsInStrings(text: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r' || char === '\t')) {
      result += char === '\t' ? '\\t' : '\\n';
      continue;
    }
    result += char;
  }

  return result;
}

/** تلاش برای خواندن یک متن به‌صورت JSON با تحمل خطاهای رایج */
function tryParse(text: string): unknown {
  const escaped = escapeControlCharsInStrings(text);
  const relaxed = removeTrailingCommas(escaped);
  const candidates = [
    text,
    escaped,
    relaxed,
    fixCurlyQuotedKeys(relaxed),
    replaceNonFiniteNumbers(relaxed),
  ];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed !== null && typeof parsed === 'object') return parsed;
    } catch {
      // گزینه‌ی بعدی
    }
  }

  return undefined;
}

/**
 * ساختار ناقص را می‌بندد:
 *   • مقدار نیمه‌کاره‌ی آخر حذف می‌شود تا متن بریده وارد گزارش نشود،
 *   • کلیدِ بدون مقدار حذف می‌شود،
 *   • براکت‌های باز به ترتیب از درون به بیرون بسته می‌شوند.
 */
function closeIncompleteJson(text: string): string {
  const { inString } = scanJsonStructure(text);
  let result = text;

  if (inString) {
    // آخرین گیومه، شروع رشته‌ی ناتمام است؛ از همان‌جا می‌بریم
    const lastQuote = result.lastIndexOf('"');
    result = lastQuote > 0 ? result.slice(0, lastQuote) : '';
  }

  result = result.replace(/\\+$/, '');
  result = result.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
  result = result.replace(/,\s*$/, '');

  const { openClosers } = scanJsonStructure(result);
  return result + [...openClosers].reverse().join('');
}

/** ویرگول آویزان قبل از بستن براکت‌ها را حذف می‌کند */
function removeTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, '$1');
}

/** NaN و Infinity مقدار معتبر JSON نیستند؛ به null تبدیل می‌شوند */
function replaceNonFiniteNumbers(text: string): string {
  return text.replace(/(:\s*)(NaN|-?Infinity)(\s*[,}\]])/g, '$1null$3');
}

/**
 * بازیابی JSON ناقص: خروجی مدل معمولاً به سقف توکن می‌رسد و وسط ساختار
 * (مثلاً وسط «weaknesses» یا میان دو معیار) قطع می‌شود. هر بخشی که کامل
 * شده باشد نگه داشته می‌شود (مثلاً ۶ معیار کامل از ۸ معیار).
 */
function salvageIncompleteJson(text: string): unknown {
  if (!text.trim()) return undefined;

  const direct = tryParse(closeIncompleteJson(text));
  if (direct !== undefined) return direct;

  const { closedAt } = scanJsonStructure(text);
  // از انتها به عقب تا ۳۰ ساختار کامل عقب می‌رویم تا زمان اجرا کنترل‌شده بماند
  const stopAt = Math.max(0, closedAt.length - 30);
  for (let index = closedAt.length - 1; index >= stopAt; index -= 1) {
    const slice = text.slice(0, closedAt[index]).replace(/,\s*$/, '');
    const parsed = tryParse(closeIncompleteJson(slice));
    if (parsed !== undefined) return parsed;
  }

  return undefined;
}

/**
 * خواندن JSON از متن آزاد مدل.
 * خروجی `undefined` یعنی هیچ ساختار قابل استفاده‌ای (حتی ناقص) پیدا نشد.
 */
export function parseLooseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');

  const candidates: string[] = [trimmed];
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (parsed !== undefined) return parsed;
  }

  // خروجی بریده‌شده: از آخرین ساختار کامل به عقب تلاش می‌کنیم
  return salvageIncompleteJson(objectStart !== -1 ? trimmed.slice(objectStart) : trimmed);
}
