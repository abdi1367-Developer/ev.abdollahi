/**
 * ارتباط با سرویس‌های مدل زبانی.
 *
 * زنجیره: مدل‌های رایگان OpenRouter (شناسه‌ها به‌صورت زمان‌اجرا کشف می‌شوند،
 * چون مرتب تغییر می‌کنند) → DeepSeek به‌عنوان Fallback قابل‌اعتماد.
 * هیچ کلیدی در کد نیست؛ همه از `process.env` خوانده می‌شوند.
 */
import type { ChatMessage } from './prompt';
import { AIError } from './errors';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

const DISCOVERY_TIMEOUT_MS = 8000;
const MODELS_CACHE_TTL_MS = 10 * 60 * 1000;
/** حداکثر توکن خروجی؛ برای گزارش JSON کافی است و هزینه را کنترل می‌کند */
const MAX_OUTPUT_TOKENS = 4000;

let modelsCache: { at: number; models: string[] } | null = null;

export function getOpenRouterApiKey(): string | null {
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  return key || null;
}

export interface DeepSeekConfig {
  url: string;
  apiKey: string;
  model: string;
}

/** تنظیمات DeepSeek؛ اگر کلید تنظیم نشده باشد null برمی‌گردد */
export function getDeepSeekConfig(): DeepSeekConfig | null {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey) return null;

  const base = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').trim().replace(/\/+$/, '');
  const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;

  return {
    url,
    apiKey,
    model: (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim() || 'deepseek-chat',
  };
}

/** مدل‌های رایگان معرفی‌شده از طریق متغیر محیطی (اولویت بر کشف خودکار) */
function modelsFromEnv(): string[] {
  return (process.env.OPENROUTER_FREE_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

interface ChatRequest {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs: number;
  provider: 'openrouter' | 'deepseek';
  extraHeaders?: Record<string, string>;
  jsonMode?: boolean;
}

function extractContent(payload: any): string {
  const choice = payload?.choices?.[0];
  const raw = choice?.message?.content ?? choice?.text ?? payload?.output_text ?? '';

  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part: any) => (typeof part === 'string' ? part : String(part?.text ?? part?.content ?? '')))
      .join('');
  }
  return '';
}

function failureMessage(provider: string, status: number): string {
  if (status === 401 || status === 403) return `کلید دسترسی ${provider} نامعتبر است یا منقضی شده.`;
  if (status === 402) return `اعتبار حساب ${provider} کافی نیست.`;
  if (status === 429) return `سرویس ${provider} در حال حاضر محدودیت درخواست دارد.`;
  if (status >= 500) return `سرویس ${provider} موقتاً در دسترس نیست.`;
  return `درخواست به ${provider} ناموفق بود (کد ${status}).`;
}

/**
 * یک درخواست Chat Completion با مهلت زمانی.
 * خطاها همیشه به‌صورت `AIError` پرتاب می‌شوند تا لایه‌ی بالاتر بتواند تصمیم بگیرد.
 */
export async function callChatCompletion(request: ChatRequest): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(request.timeoutMs, 1000));

  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
        ...(request.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AIError(failureMessage(request.provider, response.status), {
        kind:
          response.status === 401 || response.status === 403
            ? 'auth'
            : response.status === 429
              ? 'rate_limit'
              : response.status >= 500
                ? 'server'
                : 'unknown',
        status: 502,
        upstreamStatus: response.status,
        provider: request.provider,
        model: request.model,
        detail: body.slice(0, 400),
      });
    }

    const payload: any = await response.json().catch(() => null);
    if (!payload) {
      throw new AIError(`پاسخ ${request.provider} قابل خواندن نبود.`, {
        kind: 'invalid_output',
        status: 502,
        provider: request.provider,
        model: request.model,
      });
    }

    if (payload.error) {
      throw new AIError(String(payload.error?.message ?? `خطای ${request.provider}`), {
        kind: 'server',
        status: 502,
        provider: request.provider,
        model: request.model,
        detail: JSON.stringify(payload.error).slice(0, 400),
      });
    }

    const content = extractContent(payload).trim();
    if (!content) {
      throw new AIError(`مدل ${request.model} پاسخ خالی برگرداند.`, {
        kind: 'invalid_output',
        status: 502,
        provider: request.provider,
        model: request.model,
      });
    }

    return content;
  } catch (error) {
    if (error instanceof AIError) throw error;

    if (timedOut) {
      throw new AIError(`مدل ${request.model} در مهلت ${Math.round(request.timeoutMs / 1000)} ثانیه پاسخ نداد.`, {
        kind: 'timeout',
        status: 504,
        provider: request.provider,
        model: request.model,
      });
    }

    throw new AIError(`ارتباط با ${request.provider} برقرار نشد.`, {
      kind: 'network',
      status: 502,
      provider: request.provider,
      model: request.model,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * استخراج شناسه‌ی مدل‌های رایگان از پاسخ `/api/v1/models`.
 * معیار: قیمت ورودی و خروجی صفر باشد یا شناسه با `:free` تمام شود،
 * مدل متنی باشد و پنجره‌ی زمینه‌ی کافی داشته باشد.
 */
export function parseFreeModels(payload: unknown, limit = 6): string[] {
  const data = (payload as any)?.data;
  if (!Array.isArray(data)) return [];

  const candidates: Array<{ id: string; context: number }> = [];

  for (const model of data) {
    const id = typeof model?.id === 'string' ? model.id : '';
    if (!id) continue;

    const isFreeTag = id.endsWith(':free');
    const pricing = model?.pricing ?? {};
    const promptPrice = Number(pricing.prompt);
    const completionPrice = Number(pricing.completion);
    const isZeroPrice =
      Number.isFinite(promptPrice) &&
      Number.isFinite(completionPrice) &&
      promptPrice === 0 &&
      completionPrice === 0;

    if (!isFreeTag && !isZeroPrice) continue;

    const modality = String(model?.architecture?.modality ?? model?.architecture?.input_modalities ?? '');
    if (modality && !/text/i.test(modality)) continue;

    const context = Number(model?.context_length ?? 0);
    if (context && context < 16000) continue;

    candidates.push({ id, context: Number.isFinite(context) ? context : 0 });
  }

  const sorted = candidates.sort((a, b) => b.context - a.context);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of sorted) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    result.push(candidate.id);
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * کشف مدل‌های رایگان موجود.
 * ترتیب اولویت: متغیر محیطی → کش حافظه → فهرست عمومی OpenRouter.
 * در صورت خطا آرایه‌ی خالی برمی‌گردد تا زنجیره به DeepSeek ادامه پیدا کند.
 */
export async function discoverFreeModels(limit = 3): Promise<string[]> {
  const envModels = modelsFromEnv();
  if (envModels.length) return envModels.slice(0, limit);

  if (modelsCache && Date.now() - modelsCache.at < MODELS_CACHE_TTL_MS) {
    return modelsCache.models.slice(0, limit);
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[ai] free model discovery failed:', response.status);
      return modelsCache?.models.slice(0, limit) ?? [];
    }

    const payload = await response.json();
    const models = parseFreeModels(payload, 8);
    if (models.length) {
      modelsCache = { at: Date.now(), models };
    }
    return models.slice(0, limit);
  } catch (error) {
    console.warn('[ai] free model discovery error:', error instanceof Error ? error.message : error);
    return modelsCache?.models.slice(0, limit) ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/** فراخوانی مدل رایگان OpenRouter */
export async function callOpenRouter(params: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs: number;
}): Promise<string> {
  const siteUrl = (process.env.OPENROUTER_SITE_URL || 'https://thesis-evaluator.vercel.app').trim();
  return callChatCompletion({
    url: OPENROUTER_CHAT_URL,
    apiKey: params.apiKey,
    model: params.model,
    messages: params.messages,
    timeoutMs: params.timeoutMs,
    provider: 'openrouter',
    extraHeaders: {
      'HTTP-Referer': siteUrl,
      'X-Title': 'Thesis Evaluator',
    },
  });
}

/** فراخوانی DeepSeek (Fallback) */
export async function callDeepSeek(params: {
  config: DeepSeekConfig;
  messages: ChatMessage[];
  timeoutMs: number;
}): Promise<string> {
  return callChatCompletion({
    url: params.config.url,
    apiKey: params.config.apiKey,
    model: params.config.model,
    messages: params.messages,
    timeoutMs: params.timeoutMs,
    provider: 'deepseek',
    jsonMode: true,
  });
}
