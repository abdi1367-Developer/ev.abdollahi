/**
 * تبدیل گزارش ارزیابی به Markdown و JSON برای دانلود.
 * فقط از تایپ‌ها و توابع خالص استفاده می‌کند و در کلاینت اجرا می‌شود.
 */
import type {
  AnalysisInfo,
  ConvertInfo,
  EvaluationReport,
  TemplateSnapshot,
  ThesisMeta,
} from './types';
import { ensureReportBullets } from './bullets';
import { polishPersianMarkdown, polishPersianText } from './persian';
import { faNumber, formatFaDate } from './format';
import { formatJalaliIso, isoToJalali } from './jalali';

export interface ReportExportInput {
  meta: ThesisMeta;
  report: EvaluationReport;
  analysis?: AnalysisInfo;
  convert?: ConvertInfo;
  createdAt?: string;
  /** دستور اختصاصی کاربر که تحلیل بر اساس آن انجام شده است */
  instructions?: string;
  /** قالب ارزیابی استفاده‌شده */
  template?: TemplateSnapshot;
}

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter (مدل رایگان)',
  deepseek: 'DeepSeek',
};

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/**
 * درست‌نویسی متن‌های تولیدشده‌ی گزارش (فاصله‌گذاری، نیم‌فاصله و املای فارسی).
 * گزارش‌های قدیمیِ ذخیره‌شده هم هنگام نمایش اصلاح می‌شوند؛ اعمال دوباره‌ی آن
 * نتیجه را تغییر نمی‌دهد (idempotent).
 */
export function polishReport(report: EvaluationReport): EvaluationReport {
  if (!report || !Array.isArray(report.criteria)) return report;
  return {
    ...report,
    summary: polishPersianText(report.summary ?? ''),
    top_recommendations: Array.isArray(report.top_recommendations)
      ? report.top_recommendations.map((item) => polishPersianText(item))
      : [],
    criteria: report.criteria.map((criterion) => ({
      ...criterion,
      reasoning: polishPersianText(criterion.reasoning ?? ''),
      strengths: Array.isArray(criterion.strengths)
        ? criterion.strengths.map((item) => polishPersianText(item))
        : [],
      weaknesses: Array.isArray(criterion.weaknesses)
        ? criterion.weaknesses.map((item) => polishPersianText(item))
        : [],
    })),
  };
}

/** گزارش خوانا به‌صورت Markdown (قابل استفاده در Word/Notion/GitHub) */
export function reportToMarkdown(input: ReportExportInput): string {
  const { meta, report: rawReport, analysis, convert, createdAt, instructions, template } = input;
  // حتی گزارش‌های قدیمی ذخیره‌شده هم در خروجی حداقل ۵ نقطه قوت/ضعف دارند
  const report = ensureReportBullets(rawReport);
  const lines: string[] = [];

  lines.push('# گزارش ارزیابی پایان‌نامه');
  lines.push('');
  lines.push(`**عنوان:** ${meta.title}`);
  lines.push(`**دانشجو:** ${meta.studentName}${meta.studentId ? ` (${meta.studentId})` : ''}`);
  if (meta.phone) lines.push(`**شماره تماس:** ${meta.phone}`);
  if (meta.degree) lines.push(`**مقطع:** ${meta.degree}`);
  if (meta.field) lines.push(`**رشته:** ${meta.field}`);
  if (meta.university) lines.push(`**دانشگاه / مؤسسه:** ${meta.university}`);
  if (meta.supervisor) lines.push(`**استاد راهنما:** ${meta.supervisor}`);
  if (meta.advisor) lines.push(`**استاد مشاور:** ${meta.advisor}`);
  if (meta.defenseDate) {
    const defenseJalali = isoToJalali(meta.defenseDate)
      ? formatJalaliIso(meta.defenseDate)
      : meta.defenseDate;
    lines.push(`**تاریخ دفاع:** ${defenseJalali}`);
  }
  if (createdAt) lines.push(`**تاریخ ارزیابی:** ${formatFaDate(createdAt)}`);
  if (template) lines.push(`**قالب ارزیابی:** ${template.name}`);
  lines.push('');
  lines.push(`## نمره‌ی کلی: ${faNumber(report.overall_score, 1)} از ۱۰۰`);
  lines.push('');
  lines.push('| معیار | وزن | نمره |');
  lines.push('| --- | ---: | ---: |');
  for (const criterion of report.criteria) {
    lines.push(
      `| ${criterion.name} | ${faNumber(criterion.weight)}٪ | ${faNumber(criterion.score, 1)} |`,
    );
  }
  lines.push('');
  lines.push('## جمع‌بندی');
  lines.push('');
  lines.push(report.summary);
  lines.push('');

  if (instructions && instructions.trim()) {
    lines.push('## دستور تحلیل کاربر');
    lines.push('');
    lines.push('> تحلیل زیر با اعمال چارچوب/تأکید درخواستی کاربر انجام شده است:');
    lines.push('');
    lines.push(instructions.trim());
    lines.push('');
  }

  lines.push('## ارزیابی تفصیلی معیارها');
  lines.push('');
  report.criteria.forEach((criterion, index) => {
    lines.push(`### ${faNumber(index + 1)}. ${criterion.name} — ${faNumber(criterion.score, 1)} از ۱۰۰ (وزن ${faNumber(criterion.weight)}٪)`);
    lines.push('');
    lines.push(`**تحلیل:** ${criterion.reasoning}`);
    lines.push('');
    if (criterion.strengths.length) {
      lines.push('**نقاط قوت:**');
      for (const item of criterion.strengths) lines.push(`- ${item}`);
      lines.push('');
    }
    if (criterion.weaknesses.length) {
      lines.push('**نقاط ضعف:**');
      for (const item of criterion.weaknesses) lines.push(`- ${item}`);
      lines.push('');
    }
  });

  if (report.top_recommendations.length) {
    lines.push('## پیشنهادهای اولویت‌دار');
    lines.push('');
    report.top_recommendations.forEach((item, index) => {
      lines.push(`${faNumber(index + 1)}. ${item}`);
    });
    lines.push('');
  }

  if (meta.description) {
    lines.push('## یادداشت کاربر');
    lines.push('');
    lines.push(meta.description);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  if (analysis) {
    lines.push(`- **مدل تحلیل:** ${providerLabel(analysis.provider)} — \`${analysis.model}\``);
    lines.push(`- **زمان تحلیل:** ${faNumber(Math.round(analysis.durationMs / 1000))} ثانیه`);
    if (analysis.truncated) {
      lines.push('- **توجه:** متن ارسال‌شده به مدل به دلیل حجم زیاد، نمونه‌برداری‌شده بود.');
    }
  }
  if (convert) {
    lines.push(`- **فایل منبع:** ${convert.fileName} (${convert.fileType.toUpperCase()})`);
    if (convert.pages) lines.push(`- **تعداد صفحات:** ${faNumber(convert.pages)}`);
    lines.push(`- **تعداد کلمات متن استخراج‌شده:** ${faNumber(convert.words)}`);
  }
  lines.push('');
  lines.push('> این گزارش با کمک هوش مصنوعی تهیه شده است و جایگزین داوری رسمی انسانی نیست.');

  // اصلاح نهایی فاصله‌گذاری و املای فارسی (بدون دست‌زدن به بلوک‌های کد)
  return polishPersianMarkdown(lines.join('\n'), { orthography: true });
}

/** خروجی JSON برای بایگانی یا پردازش‌های بعدی */
export function reportToJsonObject(input: ReportExportInput) {
  return {
    generatedAt: new Date().toISOString(),
    meta: input.meta,
    evaluationDate: input.createdAt,
    instructions: input.instructions ?? null,
    template: input.template ?? null,
    report: ensureReportBullets(input.report),
    analysis: input.analysis ?? null,
    source: input.convert ?? null,
    generator: 'thesis-evaluator',
  };
}

export function reportToJson(input: ReportExportInput): string {
  return JSON.stringify(reportToJsonObject(input), null, 2);
}
