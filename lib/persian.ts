/**
 * یکسان‌سازی فاصله‌گذاری متن فارسی.
 *
 * چرا لازم است؟ مدل‌های زبانی و ابزارهای استخراج متن گاهی:
 *  - به‌جای فاصله‌ی معمولی از NBSP یا فاصله‌های باریک یونیکد استفاده می‌کنند،
 *  - نویسه‌های نامرئی (ZWSP / Word Joiner / BOM) تزریق می‌کنند که در نمایش
 *    باعث «چسبیدن» کلمات فارسی به هم می‌شود،
 *  - پس از نشانه‌های سجاوندی فاصله نمی‌گذارند («متن.متن» یا «نکته:مهم»)،
 *  - یا حروف فارسی و لاتین را بدون فاصله کنار هم می‌نویسند («مدلCIPP»).
 *
 * این ماژول این موارد را اصلاح می‌کند، بدون آنکه معنای متن را تغییر دهد.
 * نیم‌فاصله (ZWNJ) عمداً حفظ می‌شود چون بخشی از املاي فارسی است.
 */

/** فاصله‌های ویژه‌ی یونیکد که باید به فاصله‌ی معمولی تبدیل شوند */
const UNICODE_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

/** نویسه‌های نامرئی که کلمات را به هم می‌چسبانند (نیم‌فاصله حذف نمی‌شود) */
const INVISIBLE_CHARS = /[\u200b\u200d\u2060\ufeff]/g;

/** بازه‌ی حروف فارسی/عربی برای تشخیص مرز کلمه */
const PERSIAN_LETTER = '\\u0600-\\u06FF\\uFB50-\\uFDFF\\uFE70-\\uFEFC';

/** نویسه‌های نامرئی بین دو نویسه‌ی غیرفاصله: به فاصله تبدیل می‌شوند */
const INVISIBLE_BETWEEN_WORDS = /(\S)[\u200b\u2060]+(?=\S)/g;

/** ZWJ میان حروف فارسی (نه ایموجی) هم باعث چسبیدن کلمات می‌شود */
const ZWJ_BETWEEN_PERSIAN = new RegExp(`([${PERSIAN_LETTER}])\\u200d+(?=[${PERSIAN_LETTER}])`, 'g');

const PERSIAN_PUNCTUATION = '،؛؟!٪';

/** نشانه‌های سجاوندی که اگر به حرف فارسی چسبیده باشند، فاصله می‌گیرند */
const PUNCT_BEFORE_PERSIAN = new RegExp(
  // ارقام و نشانه‌های فارسی/عربی نباید باعث درج فاصله شوند («۷۲.۵» باید سالم بماند)
  `([:.;!?])(?=[${PERSIAN_LETTER}])(?![\\u060c\\u061b\\u061f\\u0660-\\u0669\\u066b\\u066c\\u06f0-\\u06f9])`,
  'g',
);
const PERSIAN_PUNCT_WITHOUT_SPACE = new RegExp(
  // نویسه‌های نشانه‌گذاری Markdown (مثل `**` یا `]`) نباید فاصله بگیرند،
  // وگرنه تأکید/پیوند در خروجی خراب می‌شود
  `([${PERSIAN_PUNCTUATION}])(?=[^\\s${PERSIAN_PUNCTUATION}\\d*_\\]\\)}|><])`,
  'g',
);
const CLOSING_BRACKET_WITHOUT_SPACE = new RegExp(`([)»”])(?=[${PERSIAN_LETTER}])`, 'g');
const OPENING_BRACKET_WITHOUT_SPACE = new RegExp(`([${PERSIAN_LETTER}])(?=[(«“])`, 'g');
const PERSIAN_THEN_LATIN = new RegExp(`([${PERSIAN_LETTER}])([A-Za-z0-9])`, 'g');
const LATIN_THEN_PERSIAN = new RegExp(`([A-Za-z0-9])([${PERSIAN_LETTER}])`, 'g');

/**
 * اصلاح فاصله‌گذاری یک رشته‌ی فارسی.
 * ورودی دست‌نخورده می‌ماند اگر فقط نویسه‌های غیرفارسی داشته باشد.
 */
export function normalizePersianSpacing(input: string): string {
  let text = String(input ?? '');
  if (!text) return '';

  // ۱) فاصله‌های یونیکد → فاصله‌ی معمولی؛ نویسه‌های نامرئیِ میان کلمات
  //    به فاصله تبدیل و در بقیه‌ی موارد حذف می‌شوند (وگرنه کلمات به هم می‌چسبند)
  text = text.replace(UNICODE_SPACES, ' ');
  text = text.replace(INVISIBLE_BETWEEN_WORDS, '$1 ');
  text = text.replace(ZWJ_BETWEEN_PERSIAN, '$1 ');
  text = text.replace(INVISIBLE_CHARS, '');

  // ۲) یکسان‌سازی «ي/ك» عربی با «ی/ک» فارسی
  text = text.replace(/\u064a/g, '\u06cc').replace(/\u0643/g, '\u06a9');

  // ۳) نیم‌فاصله‌های تکراری و فاصله‌ی اضافی پیش از نیم‌فاصله
  text = text.replace(/\u200c{2,}/g, '\u200c');
  text = text.replace(/[ \t]\u200c/g, '\u200c');

  // ۴) فاصله‌ی جاافتاده پس از نشانه‌های سجاوندی
  text = text.replace(PERSIAN_PUNCT_WITHOUT_SPACE, '$1 ');
  text = text.replace(PUNCT_BEFORE_PERSIAN, '$1 ');
  text = text.replace(CLOSING_BRACKET_WITHOUT_SPACE, '$1 ');
  text = text.replace(OPENING_BRACKET_WITHOUT_SPACE, '$1 ');

  // ۵) چسبیدن حروف فارسی و لاتین/عدد («مدلCIPP»، «CIPPمدل»)
  text = text.replace(PERSIAN_THEN_LATIN, '$1 $2');
  text = text.replace(LATIN_THEN_PERSIAN, '$1 $2');

  // ۶) فاصله‌های افقی تکراری (تورفتگی ابتدای خط حفظ می‌شود)
  text = text.replace(/([^\s])[ \t]{2,}/g, '$1 ');

  return text;
}

/**
 * اعمال یکسان‌سازی روی یک متن Markdown، بدون دست‌زدن به بلوک‌های کد.
 * هر خط جداگانه پردازش می‌شود تا ساختار Markdown (لیست، جدول، تیتر) حفظ شود.
 */
export function polishPersianMarkdown(markdown: string): string {
  const lines = String(markdown ?? '').split('\n');
  let inFence = false;

  return lines
    .map((line) => {
      // مرزهای بلوک کد: ``` یا ~~~
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return normalizePersianSpacing(line);
    })
    .join('\n');
}
