import { useId, useState } from 'react';
import type { RevenuePoint } from '@shared/types/api';
import { cn } from '@/lib/cn';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';

/** Rounds the axis maximum up to a clean step (1, 2 or 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((multiplier) => multiplier * magnitude >= value)!;
  return step * magnitude;
}

interface ChartProps<T extends RevenuePoint> {
  data: T[];
  /** Accessible name; also used as the hidden data table caption. */
  title: string;
}

/** Single-series column chart (one hue, no legend) with per-column hover tooltip. */
export function RevenueColumnChart<T extends RevenuePoint>({ data, title }: ChartProps<T>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tableId = useId();
  const maxValue = niceMax(Math.max(...data.map((point) => point.revenue), 0));
  const ticks = [0, 0.5, 1].map((ratio) => maxValue * ratio);
  const peakIndex = data.reduce((best, point, index) => (point.revenue > (data[best]?.revenue ?? 0) ? index : best), 0);
  const active = activeIndex !== null ? data[activeIndex] : undefined;

  return (
    <figure aria-describedby={tableId}>
      <div className="relative flex h-56 gap-3">
        <div className="flex w-12 flex-col-reverse justify-between pb-6 text-right text-[11px] text-ink-subtle tabular-nums" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick}>{formatCompactCurrency(tick)}</span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
            {ticks.map((tick) => (
              <span key={tick} className="h-px bg-line" />
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end justify-around">
            {data.map((point, index) => {
              const heightPercent = (point.revenue / maxValue) * 100;
              const isActive = activeIndex === index;
              return (
                <button
                  key={point.label}
                  type="button"
                  className="group relative flex h-full flex-1 items-end justify-center focus-visible:outline-offset-0"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  aria-label={`${point.label}: ${formatCurrency(point.revenue)}, ${point.tickets} vé`}
                >
                  {index === peakIndex && point.revenue > 0 && (
                    <span
                      className="absolute text-[11px] font-semibold text-ink-muted tabular-nums"
                      style={{ bottom: `calc(${heightPercent}% + 4px)` }}
                      aria-hidden
                    >
                      {formatCompactCurrency(point.revenue)}
                    </span>
                  )}
                  <span
                    className={cn(
                      'w-full max-w-6 rounded-t-[4px] bg-brand transition-opacity',
                      activeIndex !== null && !isActive && 'opacity-40',
                    )}
                    style={{ height: `${Math.max(heightPercent, point.revenue > 0 ? 1.5 : 0)}%` }}
                  />
                </button>
              );
            })}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex h-6 items-end justify-around text-[11px] text-ink-subtle" aria-hidden>
            {data.map((point) => (
              <span key={point.label} className="flex-1 text-center">
                {point.label}
              </span>
            ))}
          </div>

          {active && activeIndex !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line-strong bg-surface-raised px-3 py-2 text-xs shadow-xl"
              style={{ left: `${((activeIndex + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold">{active.label}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-ink-muted">
                <span className="size-2 rounded-full bg-brand" aria-hidden />
                <span className="font-semibold text-ink tabular-nums">{formatCurrency(active.revenue)}</span>
              </p>
              <p className="text-ink-subtle">{active.tickets} vé</p>
            </div>
          )}
        </div>
      </div>

      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">Doanh thu</th>
            <th scope="col">Số vé</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{formatCurrency(point.revenue)}</td>
              <td>{point.tickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars; labels and values are text, so the list doubles as its own table. */
export function RankedBarList<T extends RevenuePoint>({ data, title }: ChartProps<T>) {
  const maxValue = Math.max(...data.map((point) => point.revenue), 1);

  return (
    <ol aria-label={title} className="space-y-3.5">
      {data.map((point, index) => (
        <li key={point.label} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-xs text-ink-subtle tabular-nums">{index + 1}</span>
              {point.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatCompactCurrency(point.revenue)}
              <span className="ml-1.5 text-xs font-normal text-ink-subtle">· {point.tickets} vé</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04]" aria-hidden>
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${Math.max((point.revenue / maxValue) * 100, 1)}%` }}
              title={`${point.label}: ${formatCurrency(point.revenue)}`}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
