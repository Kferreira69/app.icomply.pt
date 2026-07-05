'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, AlertCircle, CheckCircle2, Circle } from 'lucide-react';

export type RagStatus = 'RED' | 'AMBER' | 'GREEN';

export const RAG_META: Record<RagStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; dot: string }> = {
  GREEN: {
    label: 'No prazo',
    color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200',
    dot: 'bg-green-500',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  AMBER: {
    label: 'Em risco',
    color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200',
    dot: 'bg-amber-400',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  RED: {
    label: 'Crítico',
    color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200',
    dot: 'bg-red-500',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

// ── Read-only badge ───────────────────────────────────────────────────────────
export function RagBadge({ status, size = 'sm' }: { status: RagStatus | null | undefined; size?: 'xs' | 'sm' | 'md' }) {
  if (!status) return <span className="text-xs text-gray-300 italic">—</span>;
  const meta = RAG_META[status];
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-semibold border', pad, meta.color, meta.bg, meta.border)}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', meta.dot)} />
      {meta.label}
    </span>
  );
}

// ── Editable RAG with narrative popover ──────────────────────────────────────
interface RagEditorProps {
  entityPath: string;           // e.g. '/projects/abc123'
  queryKeys: string[][];        // React Query keys to invalidate on save
  currentStatus?: RagStatus | null;
  currentNarrative?: string | null;
  readonly?: boolean;
}

export function RagEditor({ entityPath, queryKeys, currentStatus, currentNarrative, readonly = false }: RagEditorProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [narrative, setNarrative] = useState(currentNarrative ?? '');
  const [pendingStatus, setPendingStatus] = useState<RagStatus | null>(currentStatus ?? null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync when props change
  useEffect(() => {
    setNarrative(currentNarrative ?? '');
    setPendingStatus(currentStatus ?? null);
  }, [currentStatus, currentNarrative]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mutation = useMutation({
    mutationFn: (data: { ragStatus: RagStatus; statusNarrative: string }) =>
      api.patch(entityPath, data),
    onSuccess: () => {
      for (const k of queryKeys) qc.invalidateQueries({ queryKey: k });
      setOpen(false);
    },
  });

  if (readonly) return <RagBadge status={currentStatus} />;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-semibold px-2 py-1 text-xs transition-colors',
          currentStatus
            ? `${RAG_META[currentStatus].color} ${RAG_META[currentStatus].bg} ${RAG_META[currentStatus].border} hover:opacity-80`
            : 'text-gray-400 bg-gray-100 border-gray-200 hover:bg-gray-200',
        )}
      >
        {currentStatus ? (
          <>
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', RAG_META[currentStatus].dot)} />
            {RAG_META[currentStatus].label}
          </>
        ) : (
          <><Circle className="w-3 h-3" /> Definir RAG</>
        )}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Estado RAG</p>

          {/* Status selector */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(RAG_META) as RagStatus[]).map(s => {
              const meta = RAG_META[s];
              return (
                <button
                  key={s}
                  onClick={() => setPendingStatus(s)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition-colors',
                    pendingStatus === s
                      ? `${meta.bg} ${meta.color} ${meta.border}`
                      : 'border-gray-100 text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <span className={cn('w-3 h-3 rounded-full', meta.dot)} />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Narrative */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Narrativa / contexto</label>
            <textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              rows={3}
              placeholder="Descreve o estado atual, bloqueios, próximos passos…"
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!pendingStatus) return;
                mutation.mutate({ ragStatus: pendingStatus, statusNarrative: narrative });
              }}
              disabled={!pendingStatus || mutation.isPending}
              className="flex-1 bg-primary text-white rounded-xl py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Guardar
            </button>
            <button onClick={() => setOpen(false)} className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
