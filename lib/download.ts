/** دانلود فایل متنی در مرورگر (کلاینت) */

export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // آزادسازی حافظه پس از شروع دانلود
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadMarkdown(content: string, fileName: string): void {
  downloadTextFile(content, fileName, 'text/markdown');
}

export function downloadJson(data: unknown, fileName: string): void {
  downloadTextFile(JSON.stringify(data, null, 2), fileName, 'application/json');
}

/** کپی متن در کلیپ‌بورد با بازگشت موفقیت */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
