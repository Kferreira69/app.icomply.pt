'use client';

import { useMemo } from 'react';
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

interface Props {
  items: GanttItem[];
  className?: string;
  emptyMessage?: string;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function GanttChart({ items, className, emptyMessage = 'Sem itens para mostrar' }: Props) {
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

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-16 text-gray-400 text-sm', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white', className)}>
      <div style={{ minWidth: 700 }}>
        {/* Header row */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          {/* Name column */}
          <div className="w-56 flex-shrink-0 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200">
            Nome
          </div>
          {/* Timeline header */}
          <div className="flex-1 relative h-9">
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
