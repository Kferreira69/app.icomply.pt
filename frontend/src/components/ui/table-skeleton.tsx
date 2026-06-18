'use client'

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

const COL_WIDTHS = ['w-1/3', 'w-1/4', 'w-1/5', 'w-1/6', 'w-1/4', 'w-1/5']

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-3 bg-gray-200 rounded ${COL_WIDTHS[i % COL_WIDTHS.length]}`}
          />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-5 py-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIdx) => {
              const widths = ['w-2/5', 'w-1/5', 'w-1/6', 'w-1/4', 'w-1/5', 'w-1/6']
              const w = widths[(rowIdx + colIdx) % widths.length]
              return (
                <div key={colIdx} className={`h-4 bg-gray-100 rounded ${w}`} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
