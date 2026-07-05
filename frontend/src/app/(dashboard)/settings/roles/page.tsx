'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgRolesApi } from '@/lib/api';
import { ShieldCheck, Plus, Trash2, Edit2, Loader2, CheckCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_MODULES = [
  { key: 'dashboard',         label: 'Dashboard' },
  { key: 'projects',          label: 'Projetos & Tarefas' },
  { key: 'risks',             label: 'Riscos' },
  { key: 'evidence',          label: 'Evidências' },
  { key: 'audits',            label: 'Auditorias' },
  { key: 'capa',              label: 'CAPA' },
  { key: 'reports',           label: 'Relatórios' },
  { key: 'policies',          label: 'Políticas' },
  { key: 'gdpr',              label: 'GDPR / ROPA / DPIA' },
  { key: 'nis2',              label: 'NIS2' },
  { key: 'dora',              label: 'DORA' },
  { key: 'soa',               label: 'ISO 27001 SoA' },
  { key: 'vendors',           label: 'Fornecedores' },
  { key: 'denuncias',         label: 'Canal Denúncias' },
  { key: 'hrCompliance',      label: 'HR Compliance' },
  { key: 'aiGovernance',      label: 'AI Governance' },
  { key: 'aml',               label: 'AML/KYC' },
  { key: 'antiBribery',       label: 'Anti-Bribery' },
  { key: 'workforce',         label: 'ISO 45001' },
  { key: 'quality',           label: 'ISO 9001' },
];

const PERMISSION_LEVELS = [
  { value: 'none',  label: 'Sem Acesso', color: 'bg-gray-100 text-gray-500' },
  { value: 'read',  label: 'Leitura',    color: 'bg-blue-100 text-blue-700' },
  { value: 'write', label: 'Escrita',    color: 'bg-green-100 text-green-700' },
];

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

export default function CustomRolesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', permissions: {} as Record<string, string> });
  const [saved, setSaved] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['org-roles'],
    queryFn: () => orgRolesApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => orgRolesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-roles'] }); setShowForm(false); setForm({ name: '', description: '', permissions: {} }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => orgRolesApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-roles'] }); setEditing(null); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => orgRolesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-roles'] }),
  });

  const togglePermission = (moduleKey: string) => {
    const current = (editing?.permissions || form.permissions)[moduleKey] || 'none';
    const next = current === 'none' ? 'read' : current === 'read' ? 'write' : 'none';
    if (editing) setEditing((p: any) => ({ ...p, permissions: { ...p.permissions, [moduleKey]: next } }));
    else setForm(p => ({ ...p, permissions: { ...p.permissions, [moduleKey]: next } }));
  };

  const PermGrid = ({ perms, onToggle }: { perms: Record<string, string>; onToggle: (k: string) => void }) => (
    <div className="grid grid-cols-2 gap-1.5 mt-3">
      {ALL_MODULES.map(m => {
        const level = perms[m.key] || 'none';
        const config = PERMISSION_LEVELS.find(p => p.value === level)!;
        return (
          <button key={m.key} onClick={() => onToggle(m.key)} type="button"
            className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              level === 'none' ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300' : `${config.color} border-transparent`)}>
            <span className="truncate">{m.label}</span>
            <span className="ml-1 flex-shrink-0 text-[10px]">{level === 'none' ? '—' : level === 'read' ? 'R' : 'RW'}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Roles Personalizados</h2>
              <p className="text-xs text-gray-500">Define permissões granulares por módulo para cada role</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setEditing(null); }}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Plus className="w-4 h-4" /> Novo role
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Novo Role</h3>
            <input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do role (ex: Auditor Externo)" />
            <input className={inp} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)" />
            <p className="text-xs font-medium text-gray-500 mt-1">Permissões por módulo (clique para ciclar: Sem Acesso → Leitura → Escrita):</p>
            <PermGrid perms={form.permissions} onToggle={togglePermission} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Criar
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (roles as any[]).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sem roles personalizados. Crie o primeiro acima.</p>
        ) : (
          <div className="space-y-3">
            {(roles as any[]).map((role: any) => (
              <div key={role.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                    {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {Object.entries(role.permissions || {}).filter(([, v]) => v !== 'none').length} módulos com acesso
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(editing?.id === role.id ? null : { ...role, permissions: role.permissions || {} })}
                      className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeMutation.mutate(role.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editing?.id === role.id && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    <input className={inp} value={editing.name} onChange={e => setEditing((p: any) => ({ ...p, name: e.target.value }))} />
                    <input className={inp} value={editing.description || ''} onChange={e => setEditing((p: any) => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
                    <PermGrid perms={editing.permissions} onToggle={togglePermission} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditing(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                      <button onClick={() => updateMutation.mutate(editing)} disabled={updateMutation.isPending}
                        className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        {saved ? 'Guardado!' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p><strong>Nota:</strong> Os roles personalizados complementam os roles base (SUPER_ADMIN, ADMIN, COMPLIANCE_MANAGER, CONSULTANT, VIEWER). Utilize-os para criar permissões granulares por domínio de governance.</p>
        <p><strong>Ciclo de permissão:</strong> Sem Acesso (—) → Leitura (R) → Leitura+Escrita (RW) → Sem Acesso</p>
      </div>
    </div>
  );
}
