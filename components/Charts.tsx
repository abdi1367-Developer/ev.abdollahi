'use client';

import { useId } from 'react';
import { faNumber } from '@/lib/format';

export interface ChartDatum {
  label: string;
  value: number;
}

export interface ChartSegment extends ChartDatum {
  color: string;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function ChartEmpty({ label = 'داده‌ای برای نمایش نیست.' }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200/80 text-xs text-slate-400 dark:border-white/10">
      {label}
    </div>
  );
}

export function RadarChart({ data, size = 340 }: { data: ChartDatum[]; size?: number }) {
  const items = data.filter((item) => item.label.trim()).slice(0, 12);
  if (items.length < 3) return <ChartEmpty label="برای نمودار راداری حداقل سه معیار لازم است." />;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.31;
  const step = (Math.PI * 2) / items.length;
  const angleFor = (index: number) => -Math.PI / 2 + index * step;

  const polygonFor = (ratio: number) =>
    items
      .map((_, index) => {
        const point = polarPoint(cx, cy, radius * ratio, angleFor(index));
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(' ');

  const valuePolygon = items
    .map((item, index) => {
      const point = polarPoint(cx, cy, (radius * clamp(item.value)) / 100, angleFor(index));
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="chart-reveal mx-auto h-auto w-full max-w-[22rem] overflow-visible"
      role="img"
      aria-label="نمودار راداری نمره‌ی معیارها"
    >
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={polygonFor(ratio)}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-white/10"
          strokeWidth="1"
        />
      ))}

      {items.map((item, index) => {
        const end = polarPoint(cx, cy, radius, angleFor(index));
        const label = polarPoint(cx, cy, radius + 20, angleFor(index));
        const anchor = label.x > cx + 6 ? 'start' : label.x < cx - 6 ? 'end' : 'middle';
        return (
          <g key={item.label}>
            <line
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/10"
              strokeWidth="1"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-slate-500 text-[9px] font-semibold dark:fill-slate-300"
            >
              {item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}
            </text>
          </g>
        );
      })}

      <polygon points={valuePolygon} fill="rgba(249, 115, 22, 0.22)" stroke="#f97316" strokeWidth="2.5" />
      {items.map((item, index) => {
        const point = polarPoint(cx, cy, (radius * clamp(item.value)) / 100, angleFor(index));
        return (
          <g key={`point-${item.label}`}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="#fff" stroke="#ea580c" strokeWidth="2.5" />
            <title>{`${item.label}: ${faNumber(clamp(item.value), 1)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

export function TrendChart({
  data,
  height = 230,
  color = '#f97316',
}: {
  data: ChartDatum[];
  height?: number;
  color?: string;
}) {
  const gradientId = useId().replace(/:/g, '');
  if (!data.length) return <ChartEmpty label="هنوز روندی ثبت نشده است." />;

  const width = 640;
  const padX = 34;
  const padTop = 18;
  const padBottom = 34;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const count = data.length;
  const xFor = (index: number) =>
    padX + (count === 1 ? innerWidth / 2 : (index * innerWidth) / (count - 1));
  const yFor = (value: number) => padTop + (1 - clamp(value) / 100) * innerHeight;
  const points = data.map((item, index) => ({ x: xFor(index), y: yFor(item.value), item }));
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `M ${padX} ${padTop + innerHeight} L ${points
    .map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' L ')} L ${padX + innerWidth} ${padTop + innerHeight} Z`;
  const labelStep = Math.max(1, Math.ceil(count / 6));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="chart-reveal h-auto w-full overflow-visible"
      role="img"
      aria-label="نمودار روند نمره‌های ارزیابی"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="chart-grid">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = yFor(tick);
          return (
            <line
              key={tick}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              strokeDasharray={tick === 0 ? '0' : '4 5'}
            />
          );
        })}
      </g>

      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((point, index) => (
        <g key={`${point.item.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke={color} strokeWidth="2.5" />
          <title>{`${point.item.label}: ${faNumber(point.item.value, 1)}`}</title>
          {index % labelStep === 0 || index === count - 1 ? (
            <text x={point.x} y={height - 10} textAnchor="middle" className="fill-slate-400 text-[9px]">
              {point.item.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 176,
}: {
  segments: ChartSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (!segments.length || total <= 0) return <ChartEmpty />;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="chart-reveal relative mx-auto" style={{ width: size, maxWidth: '100%' }}>
      <svg viewBox="0 0 120 120" className="h-auto w-full -rotate-90" role="img" aria-label={centerLabel}>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="13"
          className="stroke-slate-100 dark:stroke-white/10"
        />
        {segments.map((segment) => {
          const length = (Math.max(0, segment.value) / total) * circumference;
          const dash = `${Math.max(0, length - 2)} ${circumference}`;
          const offset = -accumulated;
          accumulated += length;
          return (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={offset}
            >
              <title>{`${segment.label}: ${faNumber(segment.value, 1)}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{centerValue}</span>
        <span className="mt-0.5 text-[10px] text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
}

export function ScoreBars({
  data,
  showValue = true,
}: {
  data: ChartDatum[];
  showValue?: boolean;
}) {
  if (!data.length) return <ChartEmpty />;

  return (
    <ul className="space-y-3">
      {data.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-semibold text-slate-600 dark:text-slate-300">{item.label}</span>
            {showValue ? (
              <span className="shrink-0 font-extrabold tabular-nums text-orange-700 dark:text-orange-300">
                {faNumber(clamp(item.value), 1)}
              </span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className="chart-bar h-full animate-bar-grow rounded-full bg-gradient-to-l from-orange-600 via-orange-500 to-amber-400"
              style={{ width: `${Math.max(2, clamp(item.value))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}


