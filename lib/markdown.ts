/**
 * تبدیل فایل پایان‌نامه (Word .docx یا PDF) به Markdown — کاملاً سمت سرور.
 * هیچ API خارجی فراخوانی نمی‌شود؛ فقط کتابخانه‌های npm:
 *  - mammoth → تبدیل docx به Markdown با حفظ تیترها و لیست‌ها
 *  - unpdf   → استخراج متن PDF با نسخه‌ی Serverless از PDF.js
 *
 * چون این فایل از کتابخانه‌های Node استفاده می‌کند، فقط در Route Handlerها
 * (runtime = nodejs) ایمپورت شود و هرگز در کامپوننت کلاینت استفاده نشود.
 */
import type { ConvertInfo } from './types';
import { MAX_FILE_BYTES } from './upload';

export type FileKind = 'docx' | 'pdf';

export { MAX_FILE_BYTES };

export class ConversionError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'ConversionError';
    this.status = status;
  }
}

/** تشخیص نوع فایل از پسوند و MIME Type */
export function detectFileKind(fileName: string, mimeType: string): FileKind | null {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (name.endsWith('.docx') || mime.includes('wordprocessingml')) return 'docx';
  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  return null;
}

/**
 * بررسی امضای فایل (magic bytes) تا فایل‌های خراب یا با پسوند جعلی
 * پیش از پردازش رد شوند و پیام خطای دقیق بگیرند.
 */
function assertValidSignature(buffer: Buffer, kind: FileKind): void {
  if (!buffer || buffer.length < 8) {
    throw new ConversionError('فایل ارسال‌شده خالی یا ناقص است.', 400);
  }

  if (kind === 'pdf') {
    const signature = buffer.subarray(0, 5).toString('latin1');
    if (!signature.startsWith('%PDF')) {
      throw new ConversionError(
        'فایل انتخاب‌شده یک PDF معتبر نیست. لطفاً از سالم بودن فایل مطمئن شوید و دوباره تلاش کنید.',
        400,
      );
    }
    return;
  }

  // فایل‌های OLE قدیمی (doc.) با امضای D0CF11E0 شروع می‌شوند
  const ole = buffer.subarray(0, 4).toString('hex').toUpperCase();
  if (ole === 'D0CF11E0') {
    throw new ConversionError(
      'فرمت قدیمی .doc پشتیبانی نمی‌شود. لطفاً فایل را در Word با فرمت .docx ذخیره کنید.',
      415,
    );
  }

  // فایل‌های docx در واقع یک آرشیو ZIP هستند و با PK شروع می‌شوند
  const zip = buffer.subarray(0, 2).toString('latin1');
  if (zip !== 'PK') {
    throw new ConversionError(
      'فایل انتخاب‌شده یک فایل Word (.docx) معتبر نیست؛ ممکن است خراب یا با پسوند اشتباه ذخیره شده باشد.',
      400,
    );
  }
}

/**
 * نقشه‌ی استایل برای تشخیص سرفصل‌ها در فایل Word.
 * نام استایل‌ها در نسخه‌های فارسی Word می‌تواند «عنوان 1» یا «سرتیتر 1» باشد،
 * بنابراین هر دو حالت (و حالت انگلیسی) پوشش داده شده است.
 */
const DOCX_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='عنوان 1'] => h1:fresh",
  "p[style-name='عنوان 2'] => h2:fresh",
  "p[style-name='عنوان 3'] => h3:fresh",
  "p[style-name='عنوان 4'] => h4:fresh",
  "p[style-name='عنوان 5'] => h5:fresh",
  "p[style-name='عنوان 6'] => h6:fresh",
  "p[style-name='سرتیتر 1'] => h1:fresh",
  "p[style-name='سرتیتر 2'] => h2:fresh",
  "p[style-name='سرتیتر 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='عنوان سند'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='زیرعنوان'] => h2:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='نقل‌قول'] => blockquote:fresh",
].join('\n');

interface RawConversion {
  markdown: string;
  pages?: number;
  warnings: string[];
}

/** یک قطعه‌ی متنی PDF.js به‌همراه موقعیت هندسی آن */
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  hasEOL?: boolean;
}

/** نسبت «فاصله‌ی افقی به اندازه‌ی قلم» که فراتر از آن، یک فاصله‌ی واژه حساب می‌شود */
const PDF_SPACE_GAP_RATIO = 0.18;

function itemSize(item: PdfTextItem): number {
  const size = Number(item?.fontSize) || Number(item?.height) || 0;
  return size > 0 ? size : 10;
}

/**
 * آیا میان دو قطعه‌ی متنی، فاصله‌ی افقیِ یک «واژه» وجود دارد؟
 * جهت متن مهم نیست: LTR (راست‌رونده) و RTL (چپ‌رونده) هر دو سنجیده می‌شوند.
 */
function hasWordGap(prev: PdfTextItem, next: PdfTextItem): boolean {
  const prevRight = prev.x + (Number(prev.width) || 0);
  const nextRight = next.x + (Number(next.width) || 0);
  const gap = next.x >= prev.x ? next.x - prevRight : prev.x - nextRight;
  const size = Math.max(itemSize(prev), itemSize(next));
  return gap > size * PDF_SPACE_GAP_RATIO;
}

/**
 * بازسازی متن PDF از قطعه‌های متنی PDF.js.
 *
 * `extractText` کتابخانه‌ی unpdf قطعه‌ها را با رشته‌ی خالی به هم می‌چسباند؛
 * در بسیاری از PDFهای فارسی نتیجه «متنپژوهش» می‌شود. اینجا میان قطعه‌هایی که
 * بر اساس موقعیت افقی‌شان از هم فاصله دارند، فاصله‌ی معمولی گذاشته می‌شود و
 * مرزهای خط (hasEOL یا تغییر مختصات عمودی) حفظ می‌شود.
 */
export function pdfItemsToText(pages: PdfTextItem[][]): string {
  return pages
    .map((items) => {
      const lines: string[] = [];
      let line = '';
      let prev: PdfTextItem | null = null;

      const flushLine = () => {
        const text = line.trim();
        if (text) lines.push(text);
        line = '';
        prev = null;
      };

      for (const item of Array.isArray(items) ? items : []) {
        const str = String(item?.str ?? '');
        if (!str) continue;

        const sameLine =
          prev !== null &&
          !prev.hasEOL &&
          Math.abs(Number(item.y) - Number(prev.y)) <= Math.max(itemSize(item), itemSize(prev)) * 0.5;

        if (!sameLine) {
          flushLine();
          line = str;
        } else {
          const needsSpace =
            !/\s$/.test(line) && !/^\s/.test(str) && hasWordGap(prev as PdfTextItem, item);
          line += `${needsSpace ? ' ' : ''}${str}`;
        }

        prev = item;
        if (item.hasEOL) flushLine();
      }

      flushLine();
      return lines.join('\n');
    })
    .join('\n');
}

/** تبدیل فایل Word (.docx) به Markdown */
async function docxToMarkdown(buffer: Buffer): Promise<RawConversion> {
  // نکته: تایپ‌های رسمی mammoth متد convertToMarkdown را اعلام نکرده‌اند،
  // اما این متد در runtime وجود دارد؛ به همین دلیل به‌صورت any صدا زده می‌شود.
  const mammothModule = (await import('mammoth')) as any;
  const mammoth = mammothModule?.default ?? mammothModule;

  if (typeof mammoth?.convertToMarkdown !== 'function') {
    throw new ConversionError('تبدیل فایل Word در این محیط پشتیبانی نمی‌شود.', 500);
  }

  try {
    const result = await mammoth.convertToMarkdown(
      { buffer },
      {
        styleMap: DOCX_STYLE_MAP,
        includeDefaultStyleMap: true,
        ignoreEmptyParagraphs: true,
      },
    );

    const markdown = normalizeMarkdown(String(result?.value ?? ''));
    const warnings: string[] = Array.isArray(result?.messages)
      ? result.messages
          .filter((message: { type?: string }) => message?.type === 'warning')
          .map((message: { message?: string }) => String(message?.message ?? ''))
          .filter(Boolean)
          .slice(0, 5)
      : [];

    return { markdown, warnings };
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    console.error('[convert] docx error:', error);
    throw new ConversionError(
      'خواندن فایل Word ناموفق بود. ممکن است فایل خراب، رمزدار یا حاوی محتوای غیرمجاز باشد.',
      422,
    );
  }
}

/** تبدیل فایل PDF به Markdown با استخراج متن و بازسازی ساختار */
async function pdfToMarkdown(buffer: Buffer): Promise<RawConversion> {
  try {
    // unpdf نسخه‌ای از PDF.js را همراه دارد که برای محیط Serverless بهینه شده است
    const { extractText, extractTextItems, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer) as any);

    // مسیر اصلی: بازسازی متن از قطعه‌های PDF با موقعیت هندسی، تا کلمات به هم نچسبند
    let raw = '';
    let pages: number | undefined;

    try {
      const extractedItems: any = await extractTextItems(pdf as any);
      pages = Number(extractedItems?.totalPages) || undefined;
      const items: PdfTextItem[][] = Array.isArray(extractedItems?.items) ? extractedItems.items : [];
      if (items.some((page) => Array.isArray(page) && page.length > 0)) {
        raw = pdfItemsToText(items);
      }
    } catch (error) {
      // اگر نسخه‌ی نصب‌شده extractTextItems نداشت، از مسیر جایگزین استفاده می‌شود
      console.warn('[convert] pdf items error:', error);
    }

    // مسیر جایگزین: متن صفحه‌ها به‌صورت یک‌جا
    if (!raw.trim()) {
      const extracted: any = await extractText(pdf as any, { mergePages: true });
      const rawValue = extracted?.text;
      raw = Array.isArray(rawValue) ? rawValue.join('\n\n') : String(rawValue ?? '');
      pages = Number(extracted?.totalPages) || pages;
    }

    const warnings: string[] = [];
    if (raw.trim().length < 200 && (pages ?? 0) > 0) {
      warnings.push(
        'متن استخراج‌شده از PDF کوتاه است؛ احتمالاً بخشی از صفحات به‌صورت تصویری (اسکن) هستند و متن قابل استخراج ندارند.',
      );
    }

    return { markdown: pdfTextToMarkdown(raw), pages, warnings };
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    console.error('[convert] pdf error:', error);
    throw new ConversionError(
      'خواندن فایل PDF ناموفق بود. ممکن است فایل خراب، رمزدار یا فاقد لایه‌ی متنی (اسکن‌شده) باشد.',
      422,
    );
  }
}

/**
 * تابع اصلی تبدیل: اعتبارسنجی امضا، انتخاب موتور مناسب و تولید Markdown + آمار.
 */
export async function convertFile(params: {
  buffer: Buffer;
  kind: FileKind;
  fileName: string;
  fileSize: number;
}): Promise<{ markdown: string; info: ConvertInfo }> {
  assertValidSignature(params.buffer, params.kind);

  const result =
    params.kind === 'docx'
      ? await docxToMarkdown(params.buffer)
      : await pdfToMarkdown(params.buffer);

  const markdown = result.markdown.trim();

  if (markdown.replace(/\s/g, '').length < 80) {
    throw new ConversionError(
      params.kind === 'pdf'
        ? 'متنی از این PDF استخراج نشد. احتمالاً فایل اسکن‌شده (تصویری) است؛ لطفاً نسخه‌ای با لایه‌ی متنی یا فایل Word را آپلود کنید.'
        : 'متنی از این فایل Word استخراج نشد. لطفاً از سالم بودن و باز نشدن فایل در Word مطمئن شوید.',
      422,
    );
  }

  const info: ConvertInfo = {
    fileName: params.fileName,
    fileSize: params.fileSize,
    fileType: params.kind,
    pages: result.pages,
    chars: markdown.length,
    words: countWords(markdown),
    warnings: result.warnings,
    extractedAt: new Date().toISOString(),
  };

  return { markdown, info };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/*                       پاکسازی و ساختار Markdown                     */
/* ------------------------------------------------------------------ */

const SENTENCE_END = /[.!؟?»"]$/;

/** پاکسازی کلی: یکسان‌سازی خطوط، حذف کاراکترهای جهت‌دهی و فاصله‌های اضافی */
export function normalizeMarkdown(input: string): string {
  let md = String(input ?? '');

  md = md
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    // حذف کاراکترهای کنترلی جهت‌دهی متن که در فایل‌های Word/PDF زیاد یافت می‌شوند
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, '')
    // تبدیل entityهای رایج HTML
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

  md = md
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');

  return md
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** شماره‌ی صفحه‌ی تنها در یک خط (که نباید بخشی از متن محسوب شود) */
function isPageNumberLine(line: string): boolean {
  return (
    /^[\s\-–—]*(?:صفحه\s*)?[0-9۰-۹]{1,4}[\s\-–—]*$/.test(line) ||
    /^(?:page|p\.)\s*[0-9]{1,4}$/i.test(line)
  );
}

/** سرفصل‌های شناخته‌شده‌ی پایان‌نامه (فارسی و انگلیسی) */
const KNOWN_HEADINGS = [
  'چکیده',
  'abstract',
  'تقدیم',
  'پیشگفتار',
  'سپاسگزاری',
  'تشکر و قدردانی',
  'فهرست مطالب',
  'فهرست جداول',
  'فهرست شکل ها',
  'فهرست اشکال',
  'فهرست علائم و اختصارات',
  'مقدمه',
  'کلیات پژوهش',
  'نتیجه گیری',
  'بحث و نتیجه گیری',
  'منابع',
  'منابع و مآخذ',
  'مراجع',
  'پیوست',
  'پیوست ها',
  'واژه نامه',
  'ضمیمه',
].map((item) => item.replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim());

function normalizeForCompare(text: string): string {
  return text
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * تشخیص سرفصل از روی متن خام PDF (چون PDF ساختار تیتر ندارد).
 * قوانین: طول کوتاه، بدون علامت پایان جمله، شروع با «فصل/بخش/پیوست» یا
 * شماره‌گذاری سلسله‌مراتبی (۱-۲) یا برابر بودن با سرفصل‌های شناخته‌شده.
 */
function detectHeading(rawLine: string): { level: number; text: string } | null {
  const line = rawLine.trim();
  if (!line || line.length > 90) return null;
  if (SENTENCE_END.test(line)) return null;

  const comparable = normalizeForCompare(line).replace(/[:]\s*$/, '');
  for (const heading of KNOWN_HEADINGS) {
    if (comparable === heading) {
      return { level: 1, text: line.replace(/[:]\s*$/, '') };
    }
  }

  if (/^(فصل|بخش|پیوست|ضمیمه)\s+\S/i.test(line)) {
    return { level: 1, text: line };
  }
  if (/^(chapter|appendix|section)\b/i.test(line)) {
    return { level: 1, text: line };
  }

  const numbered = line.match(/^([0-9۰-۹]{1,2}(?:[.\-–][0-9۰-۹]{1,2}){0,3})[.\-–]?\s+(.{2,80})$/);
  if (numbered) {
    const depth = numbered[1].split(/[.\-–]/).length;
    return { level: Math.min(depth + 1, 4), text: line };
  }

  return null;
}

/** تبدیل خطوط بولت‌دار PDF به آیتم لیست Markdown */
function normalizeBullet(line: string): string | null {
  if (/^[•●▪◦‣■□◆]\s*/.test(line)) {
    const text = line.replace(/^[•●▪◦‣■□◆]\s*/, '').trim();
    return text ? `- ${text}` : null;
  }
  if (/^[–—]\s+/.test(line)) {
    const text = line.replace(/^[–—]\s+/, '').trim();
    return text ? `- ${text}` : null;
  }
  const ordered = line.match(/^([0-9۰-۹]{1,2})[.)]\s+(.+)$/);
  if (ordered) {
    return `${ordered[1]}. ${ordered[2].trim()}`;
  }
  return null;
}

/**
 * تبدیل متن خام PDF به Markdown ساختاریافته.
 * چون متن PDF خط‌به‌خط است، خطوط ادامه‌دار به هم چسبانده می‌شوند تا
 * پاراگراف‌های واقعی بازسازی شوند.
 */
export function pdfTextToMarkdown(raw: string): string {
  const cleaned = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, '');

  const lines = cleaned.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(' ').replace(/\s{2,}/g, ' ').trim();
    paragraph = [];
    if (text) blocks.push(text);
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    if (isPageNumberLine(line)) {
      flush();
      continue;
    }

    const heading = detectHeading(line);
    if (heading) {
      flush();
      blocks.push(`${'#'.repeat(heading.level)} ${heading.text}`);
      continue;
    }

    const bullet = normalizeBullet(line);
    if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      const lastIsList = Boolean(last) && (last.startsWith('- ') || /^[0-9۰-۹]{1,2}\.\s/.test(last));
      if (lastIsList) {
        blocks[blocks.length - 1] = `${last}\n${bullet}`;
      } else {
        blocks.push(bullet);
      }
      continue;
    }

    paragraph.push(line);
    // بستن پاراگراف‌های بسیار بلند برای خوانایی پیش‌نمایش و تحلیل بهتر
    if (paragraph.join(' ').length > 900 && SENTENCE_END.test(line)) {
      flush();
    }
  }
  flush();

  return normalizeMarkdown(blocks.join('\n\n'));
}
