import { DEGREES, type Degree, type ThesisMeta } from './types';

/** مقدار اولیه‌ی فرم */
export const EMPTY_META: ThesisMeta = {
  studentName: '',
  phone: '',
  studentId: '',
  title: '',
  degree: 'کارشناسی ارشد',
  field: '',
  university: '',
  supervisor: '',
  advisor: '',
  defenseDate: '',
  description: '',
};

/** پاک‌سازی ورودی متنی: حذف کاراکترهای کنترلی، trim و محدود کردن طول */
export function cleanText(value: unknown, maxLength = 300): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** پاک‌سازی متن چندخطی (دستور تحلیل): حفظ خطوط، حذف کاراکترهای کنترلی */
export function cleanMultiline(value: unknown, maxLength = 1500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** تبدیل ارقام فارسی/عربی به لاتین برای اعتبارسنجی */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

/** شماره تماس معتبر: ۷ تا ۱۵ رقم، با پیش‌شماره‌ی + در صورت نیاز */
export function isValidPhone(value: string): boolean {
  const digits = normalizeDigits(value).replace(/[\s\-()]/g, '');
  return /^\+?\d{7,15}$/.test(digits);
}

export interface MetaValidationResult {
  /** خطاها به تفکیک نام فیلد (برای نمایش زیر هر ورودی) */
  errors: Record<string, string>;
  /** نسخه‌ی پاک‌سازی‌شده و آماده‌ی ذخیره */
  meta: ThesisMeta;
}

/**
 * اعتبارسنجی مشخصات پایان‌نامه — هم در فرم (سمت کلاینت) و هم در API استفاده می‌شود
 * تا کاربر نتواند با دور زدن فرم، داده‌ی ناقص بفرستد.
 *
 * فقط «عنوان»، «نام دانشجو» و «شماره تماس» الزامی‌اند؛ بقیه‌ی فیلدها اختیاری‌اند
 * و اگر پر شوند اعتبارسنجی قالب روی آن‌ها انجام می‌شود.
 */
export function validateThesisMeta(input: unknown): MetaValidationResult {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const degreeValue = typeof raw.degree === 'string' ? raw.degree : '';

  const meta: ThesisMeta = {
    studentName: cleanText(raw.studentName, 120),
    phone: cleanText(raw.phone, 30),
    studentId: cleanText(raw.studentId, 40),
    title: cleanText(raw.title, 300),
    degree: (DEGREES.includes(degreeValue as Degree) ? degreeValue : 'کارشناسی ارشد') as Degree,
    field: cleanText(raw.field, 120),
    university: cleanText(raw.university, 160),
    supervisor: cleanText(raw.supervisor, 120),
    advisor: cleanText(raw.advisor, 120),
    defenseDate: cleanText(raw.defenseDate, 20),
    description: cleanText(raw.description, 2000),
  };

  const errors: Record<string, string> = {};

  if (!meta.title) errors.title = 'عنوان پایان‌نامه الزامی است.';
  if (!meta.studentName) errors.studentName = 'نام و نام خانوادگی دانشجو الزامی است.';
  if (!meta.phone) errors.phone = 'شماره تماس الزامی است.';
  else if (!isValidPhone(meta.phone))
    errors.phone = 'شماره تماس معتبر نیست؛ ۷ تا ۱۵ رقم (با کد کشور در صورت نیاز) وارد کنید.';

  if (meta.studentId && !/^[0-9۰-۹A-Za-z-]{3,20}$/.test(meta.studentId))
    errors.studentId = 'شماره دانشجویی معتبر نیست (۳ تا ۲۰ کاراکتر عددی).';
  if (degreeValue && !DEGREES.includes(degreeValue as Degree))
    errors.degree = 'مقطع تحصیلی انتخاب‌شده معتبر نیست.';
  if (meta.defenseDate && !/^\d{4}-\d{2}-\d{2}$/.test(meta.defenseDate))
    errors.defenseDate = 'تاریخ دفاع انتخاب‌شده معتبر نیست.';

  return { errors, meta };
}

/** شناسه‌های مجاز برای رکوردها (UUID یا شناسه‌ی امن) */
export function isValidRecordId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(id);
}

/** ساخت شناسه‌ی یکتا — در مرورگر از crypto.randomUUID استفاده می‌کند */
export function createRecordId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  // Fallback برای محیط‌های قدیمی (احتمال برخورد بسیار کم است)
  return `eval-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
