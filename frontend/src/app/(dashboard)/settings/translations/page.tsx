'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { translationsApi } from '@/lib/api';
import { Languages, Search, Save, RotateCcw, Zap, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ptMessages from '../../../../../messages/pt.json';

// ── Flatten nested JSON into dot-notation keys ────────────────

function flattenMessages(obj: Record<string, any>, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const dotKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      Object.assign(acc, flattenMessages(val, dotKey));
    } else {
      acc[dotKey] = String(val);
    }
    return acc;
  }, {} as Record<string, string>);
}

const PT_FLAT = flattenMessages(ptMessages);

const LOCALES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function TranslationsPage() {
  const [targetLocale, setTargetLocale] = useState('en');
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const qc = useQueryClient();

  // Load all overrides for selected locale
  const { data: overrides = {} } = useQuery({
    queryKey: ['translation-overrides', targetLocale],
    queryFn: () =>
      translationsApi.getOverridesMap(targetLocale).then(r => r.data as Record<string, string>),
  });

  const upsertOverride = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      translationsApi.upsertOverride(targetLocale, key, value),
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ['translation-overrides', targetLocale] });
      setEditingKey(null);
      setSavedKeys(prev => new Set([...prev, key]));
      setTimeout(() => setSavedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }), 2000);
    },
  });

  const deleteOverride = useMutation({
    mutationFn: (key: string) => translationsApi.deleteOverride(targetLocale, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['translation-overrides', targetLocale] }),
  });

  const translateOne = async (key: string, ptText: string) => {
    setTranslatingKey(key);
    try {
      const res = await translationsApi.translate(key, ptText, targetLocale, true);
      qc.invalidateQueries({ queryKey: ['translation-overrides', targetLocale] });
      setSavedKeys(prev => new Set([...prev, key]));
      setTimeout(() => setSavedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }), 2000);
    } catch {
      // DeepL not configured
    }
    setTranslatingKey(null);
  };

  const keys = Object.keys(PT_FLAT).filter(k =>
    !search ||
    k.toLowerCase().includes(search.toLowerCase()) ||
    PT_FLAT[k].toLowerCase().includes(search.toLowerCase()) ||
    (overrides[k] || '').toLowerCase().includes(search.toLowerCase()),
  );

  const overrideCount = Object.keys(overrides).length;

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(overrides[key] ?? '');
  };

  const saveEdit = () => {
    if (!editingKey) return;
    upsertOverride.mutate({ key: editingKey, value: editValue });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Languages className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Traduções</h1>
            <p className="text-sm text-gray-500">
              Edite traduções manualmente ou use DeepL para tradução automática
            </p>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Target locale selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Traduzir para:</span>
            <div className="flex gap-1">
              {LOCALES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setTargetLocale(l.code)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    targetLocale === l.code
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <span>{l.flag}</span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">{overrideCount}</span> substituições manuais ·{' '}
            <span className="font-medium text-gray-900">{keys.length}</span> chaves totais
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar chaves de tradução..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Para usar a tradução automática com DeepL, configure <code className="bg-amber-100 px-1 rounded">DEEPL_API_KEY</code> no ficheiro{' '}
            <code className="bg-amber-100 px-1 rounded">.env.production</code> do servidor.
            As substituições manuais têm prioridade sobre as traduções automáticas.
          </span>
        </div>
      </div>

      {/* Translation table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Chave</div>
          <div className="col-span-4">🇵🇹 Português (base)</div>
          <div className="col-span-4">
            {LOCALES.find(l => l.code === targetLocale)?.flag}{' '}
            {LOCALES.find(l => l.code === targetLocale)?.name} (tradução)
          </div>
          <div className="col-span-1 text-center">Ações</div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {keys.map(key => {
            const ptVal = PT_FLAT[key];
            const override = overrides[key];
            const isEditing = editingKey === key;
            const isSaved = savedKeys.has(key);
            const isTranslating = translatingKey === key;

            return (
              <div
                key={key}
                className={cn(
                  'grid grid-cols-12 gap-0 px-4 py-3 items-start',
                  override ? 'bg-blue-50/30' : 'hover:bg-gray-50',
                )}
              >
                {/* Key */}
                <div className="col-span-3 pr-3">
                  <code className="text-xs text-gray-500 break-all">{key}</code>
                  {override && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1 rounded">manual</span>
                  )}
                </div>

                {/* PT value */}
                <div className="col-span-4 pr-3">
                  <span className="text-sm text-gray-700">{ptVal}</span>
                </div>

                {/* Translation (override or empty) */}
                <div className="col-span-4 pr-3">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingKey(null);
                        }}
                        className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={saveEdit}
                        disabled={upsertOverride.isPending}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(key)}
                      className={cn(
                        'text-sm cursor-pointer rounded px-1 -mx-1 py-0.5 min-h-[24px]',
                        override
                          ? 'text-gray-800 hover:bg-blue-100'
                          : 'text-gray-400 italic hover:bg-gray-100',
                      )}
                    >
                      {isSaved ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Guardado
                        </span>
                      ) : (
                        override || 'Clique para editar...'
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-center gap-1">
                  <button
                    onClick={() => translateOne(key, ptVal)}
                    disabled={isTranslating || translatingKey !== null}
                    title="Traduzir com DeepL"
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      isTranslating
                        ? 'text-blue-400 animate-pulse'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  {override && (
                    <button
                      onClick={() => deleteOverride.mutate(key)}
                      title="Repor tradução base"
                      className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {keys.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhuma chave encontrada para "{search}"
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        {Object.keys(PT_FLAT).length} chaves de tradução · {overrideCount} substituições manuais activas para {targetLocale.toUpperCase()}
      </p>
    </div>
  );
}
