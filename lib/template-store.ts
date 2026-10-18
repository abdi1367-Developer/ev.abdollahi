/**
 * ذخیره‌سازی قالب‌های سفارشی در مرورگر.
 * قالب‌های پیش‌فرض همیشه در دسترس‌اند؛ نسخه‌های ویرایش‌شده/ساخته‌شده
 * توسط کاربر در localStorage همین دستگاه نگه داشته می‌شوند.
 */
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_TEMPLATE,
  DEFAULT_TEMPLATE_ID,
  cloneCriteria,
  findBuiltInTemplate,
  isUsableTemplate,
  type EvaluationTemplate,
} from './templates';

const CUSTOM_KEY = 'thesis-evaluator:templates:v1';
const SELECTED_KEY = 'thesis-evaluator:selected-template:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeCustomTemplate(template: EvaluationTemplate): EvaluationTemplate {
  return {
    ...template,
    builtIn: false,
    criteria: cloneCriteria(template.criteria).map((criterion, index) => ({
      ...criterion,
      key: criterion.key || `custom-${index + 1}`,
      description: criterion.description || criterion.name,
      aliases: criterion.aliases ?? [],
    })),
  };
}

export function readCustomTemplates(): EvaluationTemplate[] {
  if (!isBrowser()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUsableTemplate).map(normalizeCustomTemplate);
  } catch {
    return [];
  }
}

export function getAllTemplates(custom = readCustomTemplates()): EvaluationTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...custom];
}

export function findTemplate(id: string | null | undefined): EvaluationTemplate | null {
  if (!id) return null;
  return (
    findBuiltInTemplate(id) ??
    readCustomTemplates().find((template) => template.id === id) ??
    null
  );
}

export function readSelectedTemplateId(): string {
  if (!isBrowser()) return DEFAULT_TEMPLATE_ID;
  try {
    const value = window.localStorage.getItem(SELECTED_KEY);
    if (!value) return DEFAULT_TEMPLATE_ID;
    const exists =
      Boolean(findBuiltInTemplate(value)) ||
      readCustomTemplates().some((template) => template.id === value);
    return exists ? value : DEFAULT_TEMPLATE_ID;
  } catch {
    return DEFAULT_TEMPLATE_ID;
  }
}

export function readSelectedTemplate(): EvaluationTemplate {
  return findTemplate(readSelectedTemplateId()) ?? DEFAULT_TEMPLATE;
}

export function writeSelectedTemplate(id: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SELECTED_KEY, id);
  } catch {
    // نادیده گرفتن خطای ذخیره‌سازی
  }
}

export function createTemplateId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `custom-${cryptoObj.randomUUID()}`;
  }
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveCustomTemplate(template: EvaluationTemplate): EvaluationTemplate | null {
  if (!isBrowser()) return null;
  const prepared = normalizeCustomTemplate({
    ...template,
    id: template.builtIn || !template.id || template.id === 'new' ? createTemplateId() : template.id,
    name: template.name.trim().slice(0, 120) || 'قالب سفارشی',
  });

  if (!isUsableTemplate(prepared) || prepared.name.length < 2) return null;

  try {
    const existing = readCustomTemplates().filter((item) => item.id !== prepared.id);
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify([...existing, prepared]));
    writeSelectedTemplate(prepared.id);
    return prepared;
  } catch {
    return null;
  }
}

export function deleteCustomTemplate(id: string): void {
  if (!isBrowser()) return;
  try {
    const remaining = readCustomTemplates().filter((template) => template.id !== id);
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(remaining));
    if (readSelectedTemplateId() === id) {
      window.localStorage.setItem(SELECTED_KEY, DEFAULT_TEMPLATE_ID);
    }
  } catch {
    // نادیده گرفتن خطای ذخیره‌سازی
  }
}

export { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, BUILT_IN_TEMPLATES };
export type { EvaluationTemplate };
