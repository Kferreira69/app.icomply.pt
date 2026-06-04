'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditTemplatesApi } from '@/lib/api';
import { ClipboardList, Plus, Trash2, Edit2, CheckCircle, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const FRAMEWORKS = ['ISO 27001','NIS2','DORA','GDPR','SOC 2','CIS v8','ISO 27701','ISO 9001','EU AI Act','ISO 45001'];
const AUDIT_TYPES = ['INTERNAL','EXTERNAL','CERTIFICATION','SURVEILLANCE'];
const AUDIT_TYPE_LABELS: Record<string, string> = { INTERNAL: 'Interna', EXTERNAL: 'Externa', CERTIFICATION: 'Certificação', SURVEILLANCE: 'Vigilância' };

const DEFAULT_CHECKLIST_ITEMS = {
  'ISO 27001': [
    { section: 'Contexto', question: 'A organização definiu o contexto interno e externo relevante para o SGSI?' },
    { section: 'Liderança', question: 'Existe evidência de comprometimento da gestão de topo com o SGSI?' },
    { section: 'Gestão de Riscos', question: 'O processo de avaliação de riscos está documentado e implementado?' },
    { section: 'Controlos', question: 'A Declaração de Aplicabilidade (SoA) está atualizada e aprovada?' },
    { section: 'Evidências', question: 'Os registos de conformidade estão completos e acessíveis?' },
    { section: 'Auditorias', question: 'As auditorias internas estão agendadas e os relatórios disponíveis?' },
    { section: 'Revisão Gestão', question: 'A última revisão de gestão foi realizada e documentada?' },
  ],
  'NIS2': [
    { section: 'Gestão de Riscos', question: 'Existe uma política de gestão de riscos de cibersegurança aprovada?' },
    { section: 'Incidentes', question: 'O procedimento de notificação de incidentes (24h/72h) está implementado?' },
    { section: 'Continuidade', question: 'O plano de continuidade de negócio está testado e atualizado?' },
    { section: 'Cadeia de Abastecimento', question: 'Os fornecedores críticos foram avaliados quanto à segurança?' },
    { section: 'Higiene Digital', question: 'Existe política de higiene digital e formação regular dos colaboradores?' },
    { section: 'Gestão de Topo', question: 'O órgão de gestão aprovou formalmente as medidas de segurança (Art.20)?' },
  ],
  'GDPR': [
    { section: 'ROPA', question: 'O Registo de Atividades de Tratamento está completo e atualizado?' },
    { section: 'DPO', question: 'O DPO está designado e os seus dados comunicados à autoridade competente?' },
    { section: 'DPIA', question: 'Foram realizadas DPIA para tratamentos de alto risco?' },
    { section: 'Violações', question: 'O procedimento de notificação de violações de dados está implementado?' },
    { section: 'Contratos', question: 'Os contratos com subcontratantes (DPA) estão assinados?' },
    { section: 'Direitos', question: 'O procedimento de resposta a DSARs está documentado e testado?' },
  ],
};

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none';

export default function AuditTemplatesPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'INTERNAL', framework: 'ISO 27001', description: '' });
  const [checklistItems, setChecklistItems] = useState<Array<{ section: string; question: string; required: boolean }>>(
    DEFAULT_CHECKLIST_ITEMS['ISO 27001'].map(i => ({ ...i, required: true }))
  );

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['audit-templates'],
    queryFn: () => auditTemplatesApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => auditTemplatesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audit-templates'] }); setShowNew(false); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => auditTemplatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit-templates'] }),
  });

  const handleFrameworkChange = (fw: string) => {
    setForm(p => ({ ...p, framework: fw }));
    const defaults = (DEFAULT_CHECKLIST_ITEMS as any)[fw];
    if (defaults) setChecklistItems(defaults.map((i: any) => ({ ...i, required: true })));
    else setChecklistItems([{ section: 'Geral', question: '', required: true }]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><ClipboardList className="w-5 h-5 text-green-300" /><span className="text-green-200 text-xs font-medium uppercase tracking-widest">Templates</span></div>
            <h1 className="text-2xl font-bold">Checklist Templates de Auditoria</h1>
            <p className="text-green-200 text-sm mt-1">Templates reutilizáveis por framework e tipo de auditoria</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-white text-green-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-50">
            <Plus className="w-4 h-4" /> Novo Template
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : (templates as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
          <ClipboardList className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Sem templates de auditoria</p>
          <button onClick={() => setShowNew(true)} className="mt-4 flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700">
            <Plus className="w-4 h-4" /> Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(templates as any[]).map((t: any) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{t.framework}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{AUDIT_TYPE_LABELS[t.type] || t.type}</span>
                    {t.checklistItems && <span className="text-xs text-gray-400">{JSON.parse(JSON.stringify(t.checklistItems || [])).length} itens</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); removeMutation.mutate(t.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expanded === t.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              {expanded === t.id && t.checklistItems && (
                <div className="border-t border-gray-100 p-5">
                  <div className="space-y-2">
                    {(Array.isArray(t.checklistItems) ? t.checklistItems : []).map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{item.section}</p>
                          <p className="text-sm text-gray-700">{item.question}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Template de Auditoria</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome *</label><input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Auditoria ISO 27001 Certificação" /></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                  <select className={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {AUDIT_TYPES.map(t => <option key={t} value={t}>{AUDIT_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework</label>
                  <select className={inp} value={form.framework} onChange={e => handleFrameworkChange(e.target.value)}>
                    {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Itens do Checklist</label>
                  <button onClick={() => setChecklistItems(p => [...p, { section: '', question: '', required: true }])} className="text-xs text-green-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar item</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {checklistItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-xl">
                      <input className={inp + ' col-span-1'} value={item.section} onChange={e => setChecklistItems(p => p.map((x, j) => j === i ? { ...x, section: e.target.value } : x))} placeholder="Secção" />
                      <input className={inp + ' col-span-2'} value={item.question} onChange={e => setChecklistItems(p => p.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} placeholder="Pergunta / Item de verificação" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => createMutation.mutate({ ...form, checklistItems: checklistItems.filter(i => i.question) })} disabled={!form.name || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-green-700">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Criar Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
