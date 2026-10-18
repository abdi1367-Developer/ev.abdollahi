/**
 * تایپ‌های مشترک بین کلاینت و سرور
 * (این فایل نباید هیچ import سمت‌سرور داشته باشد تا در باندل مرورگر هم قابل استفاده باشد)
 */

export type Degree = 'کارشناسی' | 'کارشناسی ارشد' | 'دکتری';

export const DEGREES: Degree[] = ['کارشناسی', 'کارشناسی ارشد', 'دکتری'];

/** مشخصات پایان‌نامه که کاربر در فرم وارد می‌کند */
export interface ThesisMeta {
  studentName: string;
  /** شماره تماس دانشجو (الزامی) */
  phone: string;
  studentId: string;
  title: string;
  degree: Degree;
  field: string;
  university: string;
  supervisor: string;
  /** اختیاری */
  advisor: string;
  /** اختیاری — تاریخ دفاع (YYYY-MM-DD) */
  defenseDate: string;
  /** اختیاری */
  description: string;
}

/** اطلاعات فایل تبدیل‌شده */
export interface ConvertInfo {
  fileName: string;
  fileSize: number;
  fileType: 'docx' | 'pdf';
  /** تعداد صفحات (فقط برای PDF) */
  pages?: number;
  chars: number;
  words: number;
  warnings: string[];
  extractedAt: string;
}

/** نتیجه‌ی یک معیار ارزیابی */
export interface CriterionResult {
  name: string;
  score: number;
  weight: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

/** گزارش نهایی ارزیابی */
export interface EvaluationReport {
  overall_score: number;
  criteria: CriterionResult[];
  summary: string;
  top_recommendations: string[];
}

/** یک معیار در قالب ارزیابی (نام و وزن قابل تنظیم) */
export interface TemplateCriterion {
  name: string;
  weight: number;
  description?: string;
}

/** نسخه‌ی ثبت‌شده‌ی قالب در گزارش و سوابق */
export interface TemplateSnapshot {
  id: string;
  name: string;
  criteria: TemplateCriterion[];
}

/** نقش کاربر در سامانه */
export type UserRole = 'admin' | 'user';

/** اطلاعات عمومی کاربر (بدون هش رمز) */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: PublicUser;
}

export interface UsersResponse {
  users: PublicUser[];
}

/** یک تلاش برای فراخوانی مدل (برای شفافیت و دیباگ) */
export interface AttemptRecord {
  provider: string;
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
}

/** اطلاعات فرایند تحلیل */
export interface AnalysisInfo {
  provider: string;
  model: string;
  /** آیا از Fallback (DeepSeek) استفاده شده است؟ */
  fallbackUsed: boolean;
  attempts: AttemptRecord[];
  /** آیا متن به‌دلیل طول زیاد خلاصه/برش داده شده است؟ */
  truncated: boolean;
  inputChars: number;
  durationMs: number;
  analyzedAt: string;
}

/** یک رکورد کامل در سوابق */
export interface EvaluationRecord {
  id: string;
  createdAt: string;
  meta: ThesisMeta;
  markdown: string;
  convert: ConvertInfo;
  report: EvaluationReport;
  analysis: AnalysisInfo;
  /** دستور تحلیل اختصاصی کاربر (اختیاری) */
  instructions?: string;
  /** قالبی که ارزیابی بر اساس آن انجام شده است */
  template?: TemplateSnapshot;
}

/** خلاصه‌ی رکورد برای لیست سوابق (بدون متن کامل و گزارش) */
export interface HistorySummary {
  id: string;
  createdAt: string;
  meta: ThesisMeta;
  overall_score: number;
  provider: string;
  model: string;
  fileType: 'docx' | 'pdf';
  /** نام قالب ارزیابی (برای نمایش در فهرست سوابق) */
  templateName?: string;
  /** نمره‌ی معیارها برای نمودارهای داشبورد سوابق */
  criteria?: Array<{ name: string; score: number; weight: number }>;
}

/** پاسخ API تبدیل فایل */
export interface ConvertResponse {
  markdown: string;
  info: ConvertInfo;
}

/** پاسخ API تحلیل */
export interface AnalyzeResponse {
  report: EvaluationReport;
  analysis: AnalysisInfo;
  /** قالب استفاده‌شده؛ برای ذخیره در گزارش و سوابق */
  template?: TemplateSnapshot;
}

/** پاسخ خطای همه‌ی APIها */
export interface ApiErrorResponse {
  error: string;
  /** خطاهای اعتبارسنجی فرم، به تفکیک نام فیلد */
  fieldErrors?: Record<string, string>;
  /** تلاش‌های ناموفق مدل‌ها (فقط در تحلیل) */
  attempts?: AttemptRecord[];
}

/** پاسخ فهرست سوابق */
export interface HistoryResponse {
  backend: 'kv' | 'local';
  persistent: boolean;
  items: HistorySummary[];
}

/** پاسخ ذخیره‌ی رکورد */
export interface SaveHistoryResponse {
  backend: 'kv' | 'local';
  stored: boolean;
  error?: string;
}

/** پاسخ دریافت یک رکورد */
export interface RecordResponse {
  backend: 'kv' | 'local';
  record: EvaluationRecord;
}
