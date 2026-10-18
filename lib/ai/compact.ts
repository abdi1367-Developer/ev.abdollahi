/**
 * فشرده‌سازی متن پایان‌نامه برای ارسال به مدل.
 *
 * چرا لازم است؟ متن کامل یک پایان‌نامه می‌تواند بیش از ۱۰۰ هزار کاراکتر باشد؛
 * این حجم هم از محدودیت پنجره‌ی مدل‌های رایگان بیشتر است و هم هزینه/زمان را بالا می‌برد.
 * راهکار: حفظ «نقشه‌ی سرفصل‌ها» + ابتدا، انتها و نمونه‌های یکنواخت از میانه‌ی متن.
 * این روش برای داوری ساختاری و محتوایی مناسب است و از ارسال متن بی‌ساختار جلوگیری می‌کند.
 */

export interface CompactResult {
  text: string;
  truncated: boolean;
  originalChars: number;
}

/** بریدن از انتها، ترجیحاً روی مرز پاراگراف یا فاصله (نه وسط کلمه) */
function cutEnd(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, Math.max(limit, 0));
  const paragraphBreak = slice.lastIndexOf('\n\n');
  if (paragraphBreak > limit * 0.6) return slice.slice(0, paragraphBreak);
  const space = slice.lastIndexOf(' ');
  return space > limit * 0.6 ? slice.slice(0, space) : slice;
}

/** بریدن از ابتدا، ترجیحاً روی مرز پاراگراف یا فاصله */
function cutStart(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(-Math.max(limit, 0));
  const paragraphBreak = slice.indexOf('\n\n');
  if (paragraphBreak !== -1 && paragraphBreak < slice.length * 0.4) return slice.slice(paragraphBreak + 2);
  const space = slice.indexOf(' ');
  return space !== -1 && space < slice.length * 0.4 ? slice.slice(space + 1) : slice;
}

/** استخراج فهرست سرفصل‌ها از متن Markdown */
export function extractOutline(markdown: string, maxChars = 2200): string {
  const headings = markdown
    .split('\n')
    .filter((line) => /^#{1,6}\s+\S/.test(line.trim()))
    .map((line) => line.trim());

  if (!headings.length) return '';

  const lines: string[] = [];
  let used = 0;
  for (const heading of headings) {
    if (used + heading.length + 1 > maxChars) {
      lines.push('- … (سرفصل‌های بیشتر حذف شد)');
      break;
    }
    lines.push(heading);
    used += heading.length + 1;
  }
  return lines.join('\n');
}

const OMISSION_MARK = '\n\n[... بخش‌هایی از متن برای محدودیت طول حذف شده است ...]\n\n';

/**
 * تولید نسخه‌ی فشرده‌ی متن.
 * اگر متن کوتاه‌تر از بودجه باشد، دست‌نخورده برگردانده می‌شود.
 */
export function compactThesis(markdown: string, maxChars: number): CompactResult {
  const normalized = String(markdown ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const originalChars = normalized.length;
  if (originalChars <= maxChars) {
    return { text: normalized, truncated: false, originalChars };
  }

  const outline = extractOutline(normalized);
  const note = `> [متن اصلی ${originalChars.toLocaleString('fa-IR')} کاراکتر بوده و برای محدودیت پنجره‌ی مدل، این نسخه نمونه‌برداری شده است.]`;
  const outlineBlock = outline ? `## نقشه‌ی سرفصل‌های پایان‌نامه\n${outline}\n\n` : '';

  const reserved = note.length + outlineBlock.length + OMISSION_MARK.length * 3 + 200;
  let budget = maxChars - reserved;

  // در موارد نادر (بودجه‌ی بسیار کوچک) فقط ابتدای متن را بفرست
  if (budget < 2000) {
    const headOnly = cutEnd(normalized, Math.max(maxChars - note.length - 50, 500));
    return {
      text: `${note}\n\n${headOnly}\n\n${OMISSION_MARK}`,
      truncated: true,
      originalChars,
    };
  }

  const headChars = Math.floor(budget * 0.4);
  const tailChars = Math.floor(budget * 0.2);
  const middleBudget = budget - headChars - tailChars;

  const head = cutEnd(normalized, headChars);
  const tail = cutStart(normalized, tailChars);

  const middleStart = head.length;
  const middleEnd = normalized.length - tail.length;
  const middleRegion = normalized.slice(middleStart, Math.max(middleEnd, middleStart));
  const chunks = 3;

  let middle = '';
  if (middleRegion.length && middleBudget > 300) {
    const perChunk = Math.floor(middleBudget / chunks);
    const pieces: string[] = [];
    for (let i = 0; i < chunks; i += 1) {
      const start = Math.floor((middleRegion.length / chunks) * i);
      const segment = middleRegion.slice(start, start + perChunk * 4);
      if (!segment.trim()) continue;
      pieces.push(cutEnd(segment, perChunk).trim());
    }
    middle = pieces.filter(Boolean).join(OMISSION_MARK);
  }

  const sections = [note, outlineBlock.trim(), head, middle, tail].filter((part) => part && part.trim());
  let text = sections.join(OMISSION_MARK);
  if (text.length > maxChars) {
    text = `${cutEnd(text, maxChars)}${OMISSION_MARK}`;
  }

  return { text: text.trim(), truncated: true, originalChars };
}
