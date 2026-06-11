'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { raciApi, type RaciEntityType } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Users, Grid3X3, User, AlertTriangle, Shield, FileText, ClipboardCheck,
  AlertCircle, Briefcase, Store, Building2, FolderOpen, CheckSquare,
  Loader2, ChevronDown, ChevronUp, Info,
} from 'lucide-react';

// ─── Entity type metadata ────────────────────────────────────────────────────

const ENTITY_TABS: { type: RaciEntityType; label: string; icon: React.ReactNode }[] = [
  { type: 'CONTROL',       label: 'Controlos',     icon: <Shield className="w-4 h-4" /> },
  { type: 'RISK',          label: 'Riscos',         icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'POLICY',        label: 'Políticas',      icon: <FileText className="w-4 h-4" /> },
  { type: 'AUDIT',         label: 'Auditorias',     icon: <ClipboardCheck className="w-4 h-4" /> },
  { type: 'CAPA',          label: 'CAPAs',          icon: <AlertCircle className="w-4 h-4" /> },
  { type: 'PROCESS',       label: 'Processos',      icon: <Briefcase className="w-4 h-4" /> },
  { type: 'VENDOR',        label: 'Fornecedores',   icon: <Store className="w-4 h-4" /> },
  { type: 'INCIDENT',      label: 'Incidentes',     icon: <AlertCircle className="w-4 h-4" /> },
  { type: 'BOARD_REPORT',  label: 'Board Reports',  icon: <Building2 className="w-4 h-4" /> },
  { type: 'PROJECT',       label: 'Projetos',       icon: <FolderOpen className="w-4 h-4" /> },
  { type: 'TASK',          label: 'Tarefas',        icon: <CheckSquare className="w-4 h-4" /> },
];

const ROLE_COLORS = {
  R: { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Responsible',  tip: 'Executa o trabalho' },
  A: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Accountable',  tip: 'Dono, assina o resultado' },
  C: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Consulted',    tip: 'Consultado antes de decisões' },
  I: { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  label: 'Informed',     tip: 'Informado sobre progressos' },
};

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['raci-summary'],
    queryFn: () => raciApi.getSummary().then(r => r.data),
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-20 animate-pulse" />
      ))}
    </div>
  );

  const stats = [
    { label: 'Atribuições totais', value: data?.total ?? 0, icon: <Grid3X3 className="w-5 h-5 text-primary" />, color: 'text-primary' },
    { label: 'Utilizadores com papel', value: data?.usersWithRoles ?? 0, icon: <Users className="w-5 h-5 text-blue-600" />, color: 'text-blue-600' },
    { label: 'Entidades cobertas', value: data?.entitiesCovered ?? 0, icon: <Shield className="w-5 h-5 text-green-600" />, color: 'text-green-600' },
    { label: 'Sem Accountable', value: data?.entitiesWithoutAccountable ?? 0, icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, color: 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            {s.icon}
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
          <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── "O meu papel" tab ───────────────────────────────────────────────────────

function MyRolesView() {
  const { data, isLoading } = useQuery({
    queryKey: ['raci-me'],
    queryFn: () => raciApi.getMyRoles().then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const assignments = data?.assignments ?? [];
  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <User className="w-12 h-12 text-gray-200 mb-3" />
        <p className="text-gray-500 font-medium">Sem atribuições RACI</p>
        <p className="text-sm text-gray-400 mt-1">Ainda não tens nenhum papel atribuído em nenhuma entidade.</p>
      </div>
    );
  }

  // Group by role
  const byRole: Record<string, any[]> = { R: [], A: [], C: [], I: [] };
  for (const a of assignments) { byRole[a.role]?.push(a); }

  return (
    <div className="space-y-6">
      {(Object.keys(byRole) as (keyof typeof ROLE_COLORS)[]).map(role => {
        const items = byRole[role];
        if (items.length === 0) return null;
        const meta = ROLE_COLORS[role];
        return (
          <div key={role}>
            <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3', meta.bg)}>
              <span className={cn('text-sm font-bold', meta.text)}>{role}</span>
              <span className={cn('text-sm', meta.text)}>{meta.label}</span>
              <span className={cn('text-xs', meta.text)}>— {meta.tip}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((a: any) => {
                const tab = ENTITY_TABS.find(t => t.type === a.entityType);
                return (
                  <div key={a.id} className={cn('bg-white rounded-xl border-2 p-4', meta.border)}>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">{tab?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-medium">{tab?.label}</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {a.entityName ?? a.entityId}
                        </p>
                        {a.notes && <p className="text-xs text-gray-400 mt-1 truncate">{a.notes}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Matrix view for a given entity type ─────────────────────────────────────

function MatrixView({ entityType }: { entityType: RaciEntityType }) {
  const { data, isLoading } = useQuery({
    queryKey: ['raci-matrix', entityType],
    queryFn: () => raciApi.getMatrix(entityType).then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const matrix = data?.matrix ?? [];
  if (matrix.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Grid3X3 className="w-12 h-12 text-gray-200 mb-3" />
        <p className="text-gray-500 font-medium">Sem atribuições RACI para este módulo</p>
        <p className="text-sm text-gray-400 mt-1">Abre qualquer registo deste módulo e atribui papéis RACI no painel lateral.</p>
      </div>
    );
  }

  // Collect all unique users across all entities
  const allUsers: Record<string, { id: string; firstName: string; lastName: string }> = {};
  for (const row of matrix) {
    for (const assignment of row.assignments ?? []) {
      allUsers[assignment.user.id] = assignment.user;
    }
  }
  const users = Object.values(allUsers);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-48">Entidade</th>
            {users.map(u => (
              <th key={u.id} className="px-3 py-3 text-center text-xs font-medium text-gray-600 min-w-[80px]">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <span className="truncate max-w-[70px]">{u.firstName}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {matrix.map((row: any) => (
            <tr key={row.entityId} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[192px]">
                {row.entityName ?? row.entityId}
              </td>
              {users.map(u => {
                const roles = (row.assignments ?? [])
                  .filter((a: any) => a.user.id === u.id)
                  .map((a: any) => a.role as keyof typeof ROLE_COLORS);
                return (
                  <td key={u.id} className="px-3 py-3 text-center">
                    {roles.length > 0 ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {roles.map((role: keyof typeof ROLE_COLORS) => (
                          <span key={role} title={ROLE_COLORS[role].tip}
                            className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold', ROLE_COLORS[role].bg, ROLE_COLORS[role].text)}>
                            {role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaciPage() {
  const [activeTab, setActiveTab] = useState<'me' | RaciEntityType>('me');

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Grid3X3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matriz RACI</h1>
          <p className="text-sm text-gray-500">Responsible · Accountable · Consulted · Informed</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5" />
          <span>Atribui papéis RACI abrindo qualquer registo nos módulos abaixo</span>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards />

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        {(Object.keys(ROLE_COLORS) as (keyof typeof ROLE_COLORS)[]).map(role => {
          const meta = ROLE_COLORS[role];
          return (
            <div key={role} className="flex items-center gap-1.5">
              <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold', meta.bg, meta.text)}>{role}</span>
              <span className="text-xs text-gray-500">{meta.label} — <span className="text-gray-400">{meta.tip}</span></span>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('me')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
            activeTab === 'me' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          <User className="w-4 h-4" /> O meu papel
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

        {ENTITY_TABS.map(tab => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
              activeTab === tab.type ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'me' ? (
          <MyRolesView />
        ) : (
          <MatrixView entityType={activeTab} />
        )}
      </div>
    </div>
  );
}
