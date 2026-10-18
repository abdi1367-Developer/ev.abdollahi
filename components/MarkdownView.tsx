'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/** نمایش Markdown با استایل فارسی/RTL (بدون افزونه‌ی typography) */
export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
