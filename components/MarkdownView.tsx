'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { polishPersianMarkdown } from '@/lib/persian';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/** نمایش Markdown با استایل فارسی/RTL (بدون افزونه‌ی typography) */
export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  // فاصله‌گذاری فارسی پیش از رندر اصلاح می‌شود تا کلمات به هم نچسبند
  const normalized = useMemo(() => polishPersianMarkdown(content), [content]);

  return (
    <div className={`markdown-body ${className}`} dir="rtl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node: _node, ...props }) {
            return <a {...props} target="_blank" rel="noopener noreferrer" />;
          },
          table({ node: _node, ...props }) {
            return (
              <div className="overflow-x-auto">
                <table {...props} />
              </div>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
