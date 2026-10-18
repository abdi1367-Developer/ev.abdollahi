/**
 * بررسی سریع کلید DeepSeek بدون بالا آوردن برنامه.
 *
 *   npm run ai:check
 *
 * مقادیر را از `.env.local` (و در نبود آن از متغیرهای محیطی سیستم) می‌خواند،
 * یک درخواست کوچک به DeepSeek می‌فرستد و نتیجه را چاپ می‌کند.
 * کد خروج ۰ یعنی کلید سالم است.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function loadEnvFile(fileName) {
  let text = '';
  try {
    text = readFileSync(path.join(ROOT, fileName), 'utf8');
  } catch {
    return false;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const loadedFromFile = loadEnvFile('.env.local') || loadEnvFile('.env');

const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
const model = (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim() || 'deepseek-chat';
const base = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
  .trim()
  .replace(/\/+$/, '');
const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;

console.log(`منبع متغیرها: ${loadedFromFile ? '.env.local/.env' : 'محیط سیستم'}`);
console.log(`مدل: ${model}`);
console.log(`آدرس: ${url}`);

if (!apiKey) {
  console.error('✖ DEEPSEEK_API_KEY تنظیم نشده است. آن را در فایل .env.local بگذارید.');
  process.exit(1);
}

console.log(`کلید: ${apiKey.slice(0, 6)}…${apiKey.slice(-4)} (طول ${apiKey.length})`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'همیشه پاسخ را در قالب JSON برگردان.' },
        { role: 'user', content: 'فقط این را برگردان: {"ok":true}' },
      ],
      max_tokens: 20,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
    signal: controller.signal,
  });

  const bodyText = await response.text();

  if (!response.ok) {
    console.error(`✖ DeepSeek کد ${response.status} برگرداند.`);
    console.error(bodyText.slice(0, 600));
    if (response.status === 401 || response.status === 403) {
      console.error('کلید نامعتبر یا غیرفعال است.');
    } else if (response.status === 402) {
      console.error('اعتبار حساب DeepSeek کافی نیست.');
    } else if (response.status === 429) {
      console.error('محدودیت نرخ درخواست؛ کمی بعد دوباره تلاش کنید.');
    }
    process.exit(1);
  }

  const payload = JSON.parse(bodyText);
  const content = payload?.choices?.[0]?.message?.content ?? '';
  console.log('✔ کلید DeepSeek سالم است و مدل پاسخ داد.');
  console.log(`پاسخ مدل: ${String(content).slice(0, 200)}`);
  process.exit(0);
} catch (error) {
  if (error?.name === 'AbortError') {
    console.error('✖ درخواست در ۳۰ ثانیه پاسخ نداد (timeout).');
  } else {
    console.error('✖ خطا در ارتباط با DeepSeek:', error?.message ?? error);
  }
  process.exit(1);
} finally {
  clearTimeout(timer);
}
