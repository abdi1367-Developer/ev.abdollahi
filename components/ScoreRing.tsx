'use client';

import { faNumber } from '@/lib/format';
import { scoreTone } from '@/lib/ui';

interface ScoreRingProps {
  score: number;
  caption?: string;
  size?: number;
}

export function ScoreRing({ score, caption = 'از ۱۰۰', size = 132 }: ScoreRingProps) {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  const tone = scoreTone(safeScore);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeScore / 100);

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`نمره‌ی کلی ${faNumber(safeScore, 1)} از ۱۰۰`}>
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-slate-200" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${tone.ring} transition-[stroke-dashoffset] duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold tabular-nums ${tone.text}`}>{faNumber(safeScore, 1)}</span>
          <span className="mt-0.5 text-[11px] text-slate-500">{caption}</span>
        </div>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone.text} bg-slate-50`}>{tone.label}</span>
    </div>
  );
}
