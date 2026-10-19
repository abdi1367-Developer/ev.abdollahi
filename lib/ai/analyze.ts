/**
 * هماهنگ‌کننده‌ی تحلیل پایان‌نامه.
 *
 * ۱) متن فشرده می‌شود تا در پنجره‌ی مدل جا شود.
 * ۲) مدل اصلی DeepSeek است و اولین تلاش روی آن انجام می‌شود (DEEPSEEK_API_KEY).
 * ۳) فقط اگر DeepSeek شکست بخورد و کلید OpenRouter تنظیم شده باشد، مدل‌های رایگان
 *    OpenRouter امتحان می‌شوند و در پایان یک تلاش نهایی با DeepSeek انجام می‌شود.
 * ۴) پاسخ مدل نرمال‌سازی و نمره‌ی وزنی محاسبه می‌شود.
 * همه‌ی تلاش‌ها در `analysis.attempts` ثبت می‌شوند تا کاربر بداند از کدام مدل استفاده شده است.
 */
import type { CriterionDefinition } from '../criteria';
import type { AnalysisInfo, AnalyzeResponse, AttemptRecord, EvaluationReport, ThesisMeta } from '../types';
import { buildAnalysisMessages, buildRepairMessages } from './prompt';
import { compactThesis } from './compact';
import { AIError } from './errors';
import { extractJson, normalizeReport } from './normalize';
import {
  callDeepSeek,
  callOpenRouter,
  discoverFreeModels,
  getDeepSeekConfig,
  getOpenRouterApiKey,
} from './providers';

const DEFAULTS = {
  maxChars: 24000,
  totalBudgetMs: 55000,
  freeTimeoutMs: 20000,
  deepseekReserveMs: 20000,
};

/** کمتر از این مقدار زمان، تلاش جدیدی شروع نمی‌کنیم */
const MIN_ATTEMPT_MS = 6000;
/** حداکثر تعداد مدل رایگان امتحان‌شده (برای کنترل زمان و هزینه) */
const MAX_FREE_ATTEMPTS = 2;

function readIntEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = (process.env[name] || '').trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  return new AIError(error instanceof Error ? error.message : 'خطای نامشخص در تحلیل', {
    kind: 'unknown',
    status: 502,
  });
}

function failureMessage(attempts: AttemptRecord[]): string {
  if (!attempts.length) {
    return 'هیچ مدلی برای تحلیل در دسترس نبود. لطفاً کلیدهای API و اتصال شبکه را بررسی کنید.';
  }
  const last = attempts[attempts.length - 1];
  return `تحلیل انجام نشد. آخرین خطا از ${last.provider} (${last.model}): ${last.error ?? 'نامشخص'}`;
}

interface ResponseContext {
  startedAt: number;
  attempts: AttemptRecord[];
  truncated: boolean;
  inputChars: number;
}

function buildResponse(
  report: EvaluationReport,
  provider: string,
  model: string,
  fallbackUsed: boolean,
  context: ResponseContext,
): AnalyzeResponse {
  const analysis: AnalysisInfo = {
    provider,
    model,
    fallbackUsed,
    attempts: context.attempts,
    truncated: context.truncated,
    inputChars: context.inputChars,
    durationMs: Date.now() - context.startedAt,
    analyzedAt: new Date().toISOString(),
  };
  return { report, analysis };
}

/**
 * اجرای زنجیره‌ی تحلیل.
 * در صورت شکست همه‌ی مدل‌ها، `AIError` با پیام فارسی و فهرست تلاش‌ها پرتاب می‌شود.
 */
export async function analyzeThesis(input: {
  markdown: string;
  meta: ThesisMeta;
  /** دستور اختصاصی کاربر برای چارچوب/تمرکز ارزیابی */
  instructions?: string;
  /** معیارهای قالب انتخاب‌شده (نام و وزن قابل تنظیم) */
  criteria: CriterionDefinition[];
}): Promise<AnalyzeResponse> {
  const startedAt = Date.now();

  const maxChars = readIntEnv('AI_MAX_INPUT_CHARS', DEFAULTS.maxChars, 4000, 60000);
  const totalBudgetMs = readIntEnv('AI_TOTAL_BUDGET_MS', DEFAULTS.totalBudgetMs, 15000, 120000);
  const freeTimeoutMs = readIntEnv('FREE_MODEL_TIMEOUT_MS', DEFAULTS.freeTimeoutMs, 5000, 60000);
  const reserveMs = readIntEnv('AI_DEEPSEEK_RESERVE_MS', DEFAULTS.deepseekReserveMs, 5000, 60000);

  const compact = compactThesis(input.markdown, maxChars);
  const messages = buildAnalysisMessages({
    meta: input.meta,
    markdown: compact.text,
    truncated: compact.truncated,
    originalChars: compact.originalChars,
    instructions: input.instructions,
    criteria: input.criteria,
  });

  const context: ResponseContext = {
    startedAt,
    attempts: [],
    truncated: compact.truncated,
    inputChars: compact.text.length,
  };

  const openRouterKey = getOpenRouterApiKey();
  const deepSeek = getDeepSeekConfig();

  if (!deepSeek && !openRouterKey) {
    console.error(
      '[ai] هیچ کلیدی برای DeepSeek در دسترس نیست (نه process.env.DEEPSEEK_API_KEY و نه کلید داخلی). ' +
        'این حالت نباید رخ دهد؛ مقدار BUILTIN_DEEPSEEK_KEY را در lib/ai/providers.ts بررسی کنید.',
    );
    throw new AIError(
      'کلید DeepSeek روی سرور خوانده نشد. متغیر محیطی DEEPSEEK_API_KEY را تنظیم کنید؛ ' +
        'برای اجرای محلی در فایل .env.local (و سپس ری‌استارت سرور) و برای Vercel در ' +
        'Settings → Environment Variables برای محیط‌های Production و Preview (و سپس Redeploy). ' +
        'وضعیت فعلی را می‌توانید در /api/health ببینید.',
      { kind: 'config', status: 500 },
    );
  }

  const deadline = startedAt + totalBudgetMs;

  // ---------- مرحله ۱: DeepSeek (مدل اصلی) ----------
  if (deepSeek) {
    const remaining = deadline - Date.now() - (openRouterKey ? reserveMs : 1000);
    if (remaining < MIN_ATTEMPT_MS) {
      context.attempts.push({
        provider: 'deepseek',
        model: deepSeek.model,
        ok: false,
        error: 'بودجه‌ی زمانی درخواست برای اجرای مدل اصلی کافی نبود.',
      });
    } else {
      let raw = '';
      try {
        // گزارش کامل (۵+۵ برای هر معیار) به زمان بیشتری نیاز دارد؛
        // مهلت طولانی‌تر از قطع‌شدن خروجی وسط JSON جلوگیری می‌کند.
        const timeoutMs = Math.min(remaining, reserveMs + 25000);
        raw = await callDeepSeek({ config: deepSeek, messages, timeoutMs });
        const report = normalizeReport(extractJson(raw), input.criteria);
        context.attempts.push({ provider: 'deepseek', model: deepSeek.model, ok: true });
        return buildResponse(report, 'deepseek', deepSeek.model, false, context);
      } catch (error) {
        const aiError = toAIError(error);
        console.error('[ai] deepseek failed:', aiError.kind, aiError.message);

        // اگر خروجی JSON معتبر نبود، یک تلاش اصلاحی محدود انجام می‌دهیم
        if (aiError.kind === 'invalid_output' && raw.trim() && deadline - Date.now() > 12000) {
          try {
            const repairedRaw = await callDeepSeek({
              config: deepSeek,
              messages: buildRepairMessages(raw.slice(0, 24000)),
              timeoutMs: Math.min(deadline - Date.now(), 20000),
            });
            const report = normalizeReport(extractJson(repairedRaw), input.criteria);
            context.attempts.push({
              provider: 'deepseek',
              model: deepSeek.model,
              ok: true,
              error: 'پاسخ اولیه نامعتبر بود و با تلاش اصلاحی بازیابی شد.',
            });
            return buildResponse(report, 'deepseek', deepSeek.model, false, context);
          } catch (repairError) {
            const repairAI = toAIError(repairError);
            context.attempts.push({
              provider: 'deepseek',
              model: deepSeek.model,
              ok: false,
              status: repairAI.upstreamStatus ?? repairAI.status,
              error: repairAI.message,
            });
          }
        } else {
          context.attempts.push({
            provider: 'deepseek',
            model: deepSeek.model,
            ok: false,
            status: aiError.upstreamStatus ?? aiError.status,
            error: aiError.message,
          });
        }
      }
    }
  }

  // ---------- مرحله ۲: مدل‌های رایگان OpenRouter (فقط اگر کلیدش تنظیم شده باشد) ----------
  if (openRouterKey) {
    const freeModels = await discoverFreeModels(MAX_FREE_ATTEMPTS);

    for (const model of freeModels) {
      const remaining = deadline - Date.now() - (deepSeek ? reserveMs : 1000);
      if (remaining < MIN_ATTEMPT_MS) break;

      const timeoutMs = Math.min(freeTimeoutMs, remaining);
      try {
        const content = await callOpenRouter({ apiKey: openRouterKey, model, messages, timeoutMs });
        const report = normalizeReport(extractJson(content), input.criteria);
        context.attempts.push({ provider: 'openrouter', model, ok: true });
        // مدل اصلی DeepSeek است؛ موفقیت OpenRouter یعنی استفاده از جایگزین
        return buildResponse(report, 'openrouter', model, true, context);
      } catch (error) {
        const aiError = toAIError(error);
        context.attempts.push({
          provider: 'openrouter',
          model,
          ok: false,
          status: aiError.upstreamStatus ?? aiError.status,
          error: aiError.message,
        });
        console.warn(`[ai] free model ${model} failed (${aiError.kind}): ${aiError.message}`);
        // اگر کلید OpenRouter نامعتبر است، امتحان مدل بعدی فایده‌ای ندارد
        if (aiError.kind === 'auth') break;
      }
    }
  }

  // ---------- مرحله ۳: تلاش نهایی با DeepSeek (فقط اگر OpenRouter هم امتحان شده باشد) ----------
  if (deepSeek && openRouterKey) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) {
      context.attempts.push({
        provider: 'deepseek',
        model: deepSeek.model,
        ok: false,
        error: 'بودجه‌ی زمانی درخواست پیش از تلاش نهایی با DeepSeek تمام شد.',
      });
    } else {
      let raw = '';
      try {
        // تلاش نهایی هم مثل تلاش اصلی به مهلت کافی نیاز دارد تا JSON کامل شود
        const timeoutMs = Math.min(remaining, reserveMs + 25000);
        raw = await callDeepSeek({ config: deepSeek, messages, timeoutMs });
        const report = normalizeReport(extractJson(raw), input.criteria);
        context.attempts.push({ provider: 'deepseek', model: deepSeek.model, ok: true });
        return buildResponse(report, 'deepseek', deepSeek.model, true, context);
      } catch (error) {
        const aiError = toAIError(error);

        // اگر خروجی JSON معتبر نبود، یک تلاش اصلاحی محدود انجام می‌دهیم
        if (aiError.kind === 'invalid_output' && raw.trim() && deadline - Date.now() > 12000) {
          try {
            const repairedRaw = await callDeepSeek({
              config: deepSeek,
              messages: buildRepairMessages(raw.slice(0, 24000)),
              timeoutMs: Math.min(deadline - Date.now(), 20000),
            });
            const report = normalizeReport(extractJson(repairedRaw), input.criteria);
            context.attempts.push({
              provider: 'deepseek',
              model: deepSeek.model,
              ok: true,
              error: 'پاسخ اولیه نامعتبر بود و با تلاش اصلاحی بازیابی شد.',
            });
            return buildResponse(report, 'deepseek', deepSeek.model, true, context);
          } catch (repairError) {
            const repairAI = toAIError(repairError);
            context.attempts.push({
              provider: 'deepseek',
              model: deepSeek.model,
              ok: false,
              status: repairAI.upstreamStatus ?? repairAI.status,
              error: repairAI.message,
            });
          }
        } else {
          context.attempts.push({
            provider: 'deepseek',
            model: deepSeek.model,
            ok: false,
            status: aiError.upstreamStatus ?? aiError.status,
            error: aiError.message,
          });
        }
        console.error('[ai] deepseek failed:', aiError.kind, aiError.message);
      }
    }
  }

  throw new AIError(failureMessage(context.attempts), {
    kind: 'server',
    status: 502,
    detail: JSON.stringify(context.attempts).slice(0, 800),
    attempts: context.attempts,
  });
}
