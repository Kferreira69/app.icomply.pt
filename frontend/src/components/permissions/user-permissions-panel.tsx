'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

// ── Module definitions ────────────────────────────────────────

interface ModuleGroup {
  label: string;
  modules: Array<{ key: string; label: string }>;
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Core',
    modules: [
      { key: 'dashboard',  label: 'Dashboard' },
      { key: 'projects',   label: 'Projetos' },
      { key: 'tasks',      label: 'Tarefas' },
      { key: 'reports',    label: 'Relatórios' },
    ],
  },
  {
    label: 'Gestão de Riscos',
    modules: [
      { key: 'risks',      label: 'Riscos' },
      { key: 'audits',     label: 'Auditorias' },
      { key: 'capa',       label: 'CAPA' },
      { key: 'evidence',   label: 'Evidências' },
      { key: 'diagnostic', label: 'Diagnóstico' },
    ],
  },
  {
    label: 'Compliance',
    modules: [
      { key: 'policies',   label: 'Políticas' },
      { key: 'gdpr',       label: 'GDPR / ROPA' },
      { key: 'nis2',       label: 'NIS2' },
      { key: 'dora',       label: 'DORA' },
      { key: 'soa',        label: 'SoA ISO 27001' },
    ],
  },
  {
    label: 'Módulos Avançados',
    modules: [
      { key: 'denuncias',  label: 'Canal Denúncias' },
      { key: 'vendors',    label: 'Fornecedores' },
      { key: 'aiAssistant', label: 'Assistente IA' },
      { key: 'trustCenter', label: 'Trust Center' },
      { key: 'excelImport', label: 'Importar Excel' },
    ],
  },
  {
    label: 'Administração',
    modules: [
      { key: 'users',        label: 'Utilizadores' },
      { key: 'settings',     label: 'Organização' },
      { key: 'translations', label: 'Traduções' },
    ],
  },
];

// ── Access level slider ───────────────────────────────────────

const LEVELS = [
  { value: 0, label: 'Sem Acesso',     color: 'bg-gray-200 border-gray-300',  dot: 'bg-gray-400' },
  { value: 1, label: 'Apenas Leitura', color: 'bg-blue-100 border-blue-300',  dot: 'bg-blue-500' },
  { value: 2, label: 'Acesso Total',   color: 'bg-blue-600 border-blue-700',  dot: 'bg-white'    },
];

function AccessSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const positions = ['0%', '50%', '100%'];
  const colors = ['bg-gray-300', 'bg-blue-400', 'bg-blue-600'];

  return (
    <div className="flex items-center gap-0 relative w-48">
      {/* Track */}
      <div className="relative w-full h-1.5 bg-gray-200 rounded-full">
        {/* Fill */}
        <div
          className={cn('absolute h-full rounded-full transition-all duration-200', colors[value])}
          style={{ width: positions[value] }}
        />
        {/* Range input (invisible, for interaction) */}
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed h-full"
        />
        {/* Tick marks */}
        {[0, 1, 2].map(i => (
          <div
            key={i}
            onClick={() => !disabled && onChange(i)}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-all duration-200',
              i <= value
                ? i === 2 ? 'bg-blue-600 border-blue-700' : i === 1 && value >= 1 ? 'bg-blue-400 border-blue-500' : 'bg-gray-400 border-gray-400'
                : 'bg-white border-gray-300',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            style={{ left: positions[i] }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Module row ────────────────────────────────────────────────

function ModuleRow({
  moduleKey,
  label,
  value,
  onChange,
  disabled,
}: {
  moduleKey: string;
  label: string;
  value: number;
  onChange: (mod: string, val: number) => void;
  disabled?: boolean;
}) {
  const levelLabel = LEVELS[value]?.label ?? 'Apenas Leitura';

  return (
    <div className="grid grid-cols-12 items-center py-3 px-4 hover:bg-gray-50 transition-colors">
      <div className="col-span-4 text-sm text-gray-700">{label}</div>
      <div className="col-span-4 flex justify-center">
        <AccessSlider
          value={value}
          onChange={v => onChange(moduleKey, v)}
          disabled={disabled}
        />
      </div>
      <div className="col-span-4 text-right">
        <span className={cn(
          'text-xs font-medium px-2 py-1 rounded-full',
          value === 0 ? 'bg-gray-100 text-gray-500' :
          value === 1 ? 'bg-blue-50 text-blue-600' :
          'bg-blue-600 text-white',
        )}>
          {levelLabel}
        </span>
      </div>
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────

function ModuleGroupSection({
  group,
  permissions,
  onChange,
  disabled,
}: {
  group: ModuleGroup;
  permissions: Record<string, number>;
  onChange: (mod: string, val: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(true);

  // Compute group-level access (custom if mixed)
  const levels = group.modules.map(m => permissions[m.key] ?? 1);
  const allSame = levels.every(l => l === levels[0]);
  const groupLabel = allSame ? LEVELS[levels[0]]?.label : 'Personalizado';
  const groupValue = allSame ? levels[0] : -1;

  const setAll = (val: number) => {
    group.modules.forEach(m => onChange(m.key, val));
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      {/* Group header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700">{group.label}</span>
          <span className="text-xs text-gray-400">({group.modules.length} módulos)</span>
        </div>

        {/* Quick set all buttons */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {groupValue !== -1 && (
            <span className={cn(
              'text-xs font-medium mr-2',
              groupValue === 0 ? 'text-gray-500' : groupValue === 1 ? 'text-blue-600' : 'text-blue-700',
            )}>
              {groupLabel}
            </span>
          )}
          {[
            { val: 0, label: 'Nenhum' },
            { val: 1, label: 'Leitura' },
            { val: 2, label: 'Total' },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setAll(val)}
              disabled={disabled}
              className={cn(
                'px-2 py-1 rounded text-xs transition-colors',
                groupValue === val
                  ? val === 2 ? 'bg-blue-600 text-white' : val === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                  : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Module rows */}
      {open && (
        <div className="divide-y divide-gray-100">
          {group.modules.map(m => (
            <ModuleRow
              key={m.key}
              moduleKey={m.key}
              label={m.label}
              value={permissions[m.key] ?? 1}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────

interface UserPermissionsPanelProps {
  userId: string;
  userName: string;
  userRole: string;
  onClose?: () => void;
}

export function UserPermissionsPanel({ userId, userName, userRole, onClose }: UserPermissionsPanelProps) {
  const qc = useQueryClient();

  const { data: serverPerms, isLoading } = useQuery({
    queryKey: ['permissions', userId],
    queryFn: () => permissionsApi.getUserPermissions(userId).then(r => r.data as Record<string, number>),
  });

  const [local, setLocal] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (serverPerms) {
      setLocal(serverPerms);
      setDirty(false);
    }
  }, [serverPerms]);

  const handleChange = (mod: string, val: number) => {
    setLocal(prev => ({ ...prev, [mod]: val }));
    setDirty(true);
    setSaved(false);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      permissionsApi.setUserPermissions(
        userId,
        Object.entries(local).map(([module, level]) => ({ module, level })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', userId] });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Permissões — {userName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin
              ? 'Administradores têm acesso total a todos os módulos.'
              : 'Define o nível de acesso por módulo para este utilizador.'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
        )}
      </div>

      {isAdmin ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium">Acesso Total (Administrador)</p>
            <p className="text-sm text-gray-400 mt-1">
              As permissões granulares aplicam-se apenas a utilizadores não-administradores.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
            <div className="col-span-4">Módulo</div>
            <div className="col-span-4 text-center flex justify-center gap-8 text-[10px]">
              <span>Sem Acesso</span>
              <span>Leitura</span>
              <span>Total</span>
            </div>
            <div className="col-span-4 text-right">Nível</div>
          </div>

          {/* Module groups */}
          <div className="flex-1 overflow-y-auto p-4">
            {MODULE_GROUPS.map(group => (
              <ModuleGroupSection
                key={group.label}
                group={group}
                permissions={local}
                onChange={handleChange}
                disabled={saveMutation.isPending}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {dirty ? '● Alterações por guardar' : saved ? '✓ Guardado com sucesso' : 'Sem alterações'}
            </p>
            <div className="flex gap-2">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!dirty || saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saved ? <><Check className="w-3.5 h-3.5" /> Guardado</> : 'Guardar Permissões'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
