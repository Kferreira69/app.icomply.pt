'use client';

import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface GanttItem {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number; // 0-100
  color: string;    // CSS class e.g. 'bg-blue-500'
  subtitle?: string;
  href?: string;
  indent?: boolean;
}

/** A dependency arrow: blockingId's bar end → dependentId's bar start */
export interface GanttDependency {
  blockingId: string;
  dependentId: string;
}

interface Props {
  items: GanttItem[];
  dependencies?: GanttDependency[];
  className?: string;
  emptyMessage?: string;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Row geometry constants ────────────────────────────────────────
// Must stay in sync with the layout below.
const HEADER_H = 36;   // h-9
const ROW_H    = 44;   // minHeight: 44 on each data row
const NAME_COL = 224;  // w-56

export function GanttChart({ items, dependencies = [], className, emptyMessage = 'Sem itens para mostrar' }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useLayoutEffect(() => {
    if (!timelineRef.current) return;
    const ro = new ResizeObserver(entries => {
      setTimelineWidth(entries[0].contentRect.width);
    });
    ro.observe(timelineRef.current);
    return () => ro.disconnect();
  }, []);
  // Calculate overall date range
  const { minDate, maxDate, totalMs } = useMemo(() => {
    if (!items.length) {
      const now = new Date();
      return { minDate: now, maxDate: addDays(now, 90), totalMs: 90 * 86400000 };
    }
    const starts = items.map(i => i.start.getTime());
    const ends   = items.map(i => i.end.getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    // Add 5% padding on each side
    const range = max.getTime() - min.getTime();
    const pad = range * 0.05;
    const paddedMin = new Date(min.getTime() - pad);
    const paddedMax = new Date(max.getTime() + pad);
    return { minDate: paddedMin, maxDate: paddedMax, totalMs: paddedMax.getTime() - paddedMin.getTime() };
  }, [items]);

  // Generate month column headers
  const months = useMemo(() => {
    const result: { label: string; left: number; width: number }[] = [];
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cursor <= maxDate) {
      const mStart = new Date(cursor);
      const mEnd   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
      const clampedStart = Math.max(mStart.getTime(), minDate.getTime());
      const clampedEnd   = Math.min(mEnd.getTime(), maxDate.getTime());
      if (clampedEnd > clampedStart) {
        const left  = ((clampedStart - minDate.getTime()) / totalMs) * 100;
        const width = ((clampedEnd - clampedStart) / totalMs) * 100;
        result.push({
          label: cursor.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' }),
          left,
          width,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [minDate, maxDate, totalMs]);

  // Today line
  const todayLeft = useMemo(() => {
    const now = Date.now();
    if (now < minDate.getTime() || now > maxDate.getTime()) return null;
    return ((now - minDate.getTime()) / totalMs) * 100;
  }, [minDate, maxDate, totalMs]);

  function barStyle(item: GanttItem) {
    const left  = ((item.start.getTime() - minDate.getTime()) / totalMs) * 100;
    const width = ((item.end.getTime() - item.start.getTime()) / totalMs) * 100;
    return {
      left:  `${Math.max(0, Math.min(99, left))}%`,
      width: `${Math.max(0.5, Math.min(100 - left, width))}%`,
    };
  }

  /** Returns bar left+right x positions in pixels and vertical centre y,
   *  relative to the top-left of the timeline column (excluding name col).
   *  rowIndex is 0-based among the data rows. */
  function barPixels(item: GanttItem, rowIndex: number, tlWidth: number) {
    const leftPct  = Math.max(0, Math.min(99,
      ((item.start.getTime() - minDate.getTime()) / totalMs) * 100));
    const widthPct = Math.max(0.5, Math.min(100 - leftPct,
      ((item.end.getTime() - item.start.getTime()) / totalMs) * 100));
    const x1 = (leftPct / 100) * tlWidth;
    const x2 = ((leftPct + widthPct) / 100) * tlWidth;
    const y  = HEADER_H + rowIndex * ROW_H + ROW_H / 2;
    return { x1, x2, y };
  }

  /** Build SVG arrow paths for all dependencies */
  const depArrows = useMemo(() => {
    if (!dependencies.length || !timelineWidth) return [];
    const indexById = new Map(items.map((item, i) => [item.id, i]));
    return dependencies.flatMap(({ blockingId, dependentId }) => {
      const bi = indexById.get(blockingId);
      const di = indexById.get(dependentId);
      if (bi === undefined || di === undefined) return [];
      const from = barPixels(items[bi], bi, timelineWidth);
      const to   = barPixels(items[di], di, timelineWidth);
      // Bezier: start from right-end of blocking bar, end at left-start of dependent bar
      const cx1 = from.x2 + Math.abs(to.x1 - from.x2) * 0.5;
      const cx2 = to.x1   - Math.abs(to.x1 - from.x2) * 0.5;
      return [{
        d: `M ${from.x2},${from.y} C ${cx1},${from.y} ${cx2},${to.y} ${to.x1},${to.y}`,
        key: `${blockingId}-${dependentId}`,
      }];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies, items, timelineWidth, minDate, totalMs]);

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-16 text-gray-400 text-sm', className)}>
        {emptyMessage}
      </div>
    );
  }

  // Total chart height for the SVG overlay (header + all rows)
  const svgHeight = HEADER_H + items.length * ROW_H;

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white', className)}>
      <div style={{ minWidth: 700, position: 'relative' }}>
        {/* Header row */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          {/* Name column */}
          <div className="w-56 flex-shrink-0 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200">
            Nome
          </div>
          {/* Timeline header */}
          <div ref={timelineRef} className="flex-1 relative h-9">
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute inset-y-0 flex items-center border-l border-gray-200 px-1.5"
                style={{ left: `${m.left}%`, width: `${m.width}%` }}
              >
                <span className="text-xs text-gray-400 truncate font-medium">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data rows */}
        {items.map((item) => {
          const bs = barStyle(item);
          return (
            <div key={item.id} className="flex border-b border-gray-100 last:border-0 hover:bg-gray-50/60 group transition-colors">
              {/* Name cell */}
              <div className={cn('w-56 flex-shrink-0 px-4 py-2.5 flex flex-col justify-center border-r border-gray-100', item.indent && 'pl-8')}>
                {item.href ? (
                  <Link href={item.href} className="text-sm font-medium text-gray-800 hover:text-primary truncate leading-tight">
                    {item.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-gray-800 truncate leading-tight">{item.name}</span>
                )}
                {item.subtitle && (
                  <span className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</span>
                )}
              </div>

              {/* Timeline cell */}
              <div className="flex-1 relative py-2.5" style={{ minHeight: 44 }}>
                {/* Month grid lines */}
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute inset-y-0 border-l border-gray-100"
                    style={{ left: `${m.left}%` }}
                  />
                ))}

                {/* Today line */}
                {todayLeft !== null && (
                  <div
                    className="absolute inset-y-0 w-px bg-red-400/60 z-10"
                    style={{ left: `${todayLeft}%` }}
                  />
                )}

                {/* Bar */}
                <div
                  className={cn('absolute top-2 bottom-2 rounded-md overflow-hidden flex items-center', item.color)}
                  style={bs}
                  title={`${item.start.toLocaleDateString('pt-PT')} → ${item.end.toLocaleDateString('pt-PT')} · ${item.progress}%`}
                >
                  {/* Progress overlay */}
                  {item.progress > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-black/20 rounded-l-md"
                      style={{ width: `${Math.min(100, item.progress)}%` }}
                    />
                  )}
                  {/* Progress label */}
                  <span className="relative z-10 px-2 text-xs text-white font-semibold select-none truncate">
                    {item.progress > 10 ? `${item.progress}%` : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dependency arrows SVG overlay */}
        {depArrows.length > 0 && (
          <svg
            className="absolute top-0 pointer-events-none z-20"
            style={{ left: NAME_COL, width: timelineWidth, height: svgHeight }}
            overflow="visible"
          >
            <defs>
              <marker
                id="gantt-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
              </marker>
            </defs>
            {depArrows.map(({ d, key }) => (
              <path
                key={key}
                d={d}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="5,3"
                markerEnd="url(#gantt-arrow)"
              />
            ))}
          </svg>
        )}

        {/* Today legend */}
        {todayLeft !== null && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-px bg-red-400/60" />
            Hoje
          </div>
        )}
      </div>
    </div>
  );
}
