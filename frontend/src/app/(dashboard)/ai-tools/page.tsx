'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiAssistantApi } from '@/lib/api';
import { Brain, FileText, Search, ClipboardList, Loader2, Copy, CheckCircle, ChevronDown, Sparkles, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const FRAMEWORKS = ['ISO 27001', 'NIS2', 'DORA', 'GDPR', 'EU AI Act', 'SOC 2', 'ISO 9001', 'ISO 27701', 'CIS v8', 'ISO 45001', 'ESG/CSRD'];
const POLICY_TYPES = [
  'Segurança da Informação', 'Proteção de Dados', 'Gestão de Incidentes', 'Continuidade de Negócio',
  'Controlo de Acessos', 'Gestão de Fornecedores', 'Criptografia', 'Desenvolvimento Seguro',
  'Resposta a Violações de Dados', 'Uso Aceitável', 'Classificação da Informação', 'Gestão de Riscos',
  'Anti-Suborno e Anti-Corrupção', 'Whistleblowing', 'Trabalho Remoto', 'IA Responsável',
];
const AUDIT_TYPES = ['Certificação', 'Vigilância', 'Interno', 'Externo'];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
      {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
    </button>
  );
}

function ResultCard({ title, content, onDownload }: { title: string; content: string; onDownload: () => void }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={content} />
          <button onClick={onDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">
            <Download className="w-3.5 h-3.5" /> .txt
          </button>
          <button onClick={() => setExpanded(p => !p)} className="p-1.5 hover:bg-white rounded-lg">
            <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', expanded ? 'rotate-180' : '')} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="p-5">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  );
}

const downloadText = (content: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function AiToolsPage() {
  const [activeTab, setActiveTab] = useState<'policy' | 'gap' | 'audit'>('policy');
  const [policyForm, setPolicyForm]   = useState({ policyType: '', framework: 'ISO 27001', language: 'português europeu' });
  const [gapForm, setGapForm]         = useState({ framework: 'NIS2' });
  const [auditForm, setAuditForm]     = useState({ framework: 'ISO 27001', auditType: 'Certificação' });
  const [policyResult, setPolicyResult] = useState<string | null>(null);
  const [gapResult, setGapResult]       = useState<string | null>(null);
  const [auditResult, setAuditResult]   = useState<string | null>(null);

  const policyMutation = useMutation({
    mutationFn: () => aiAssistantApi.generatePolicy(policyForm).then(r => r.data),
    onSuccess: (d: any) => setPolicyResult(d.policy),
  });
  const gapMutation = useMutation({
    mutationFn: () => aiAssistantApi.gapAnalysis(gapForm).then(r => r.data),
    onSuccess: (d: any) => setGapResult(d.analysis),
  });
  const auditMutation = useMutation({
    mutationFn: () => aiAssistantApi.auditPrep(auditForm).then(r => r.data),
    onSuccess: (d: any) => setAuditResult(d.checklist),
  });

  const sel = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none';

  const tabs = [
    { key: 'policy', label: 'Gerador de Políticas', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'gap',    label: 'Análise de Gap',        icon: Search,   color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'audit',  label: 'Prep. de Auditoria',    icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-700 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-6 h-6 text-violet-300" />
          <span className="text-violet-200 text-xs font-medium uppercase tracking-widest">iComply AI</span>
        </div>
        <h1 className="text-2xl font-bold">AI Compliance Tools</h1>
        <p className="text-violet-200 text-sm mt-1">Geração automática de documentos e análises de conformidade com IA</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left', activeTab === tab.key ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-300 shadow-sm')}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', tab.bg)}>
              <tab.icon className={cn('w-5 h-5', tab.color)} />
            </div>
            <span className={cn('text-sm font-semibold', activeTab === tab.key ? 'text-blue-700' : 'text-gray-700')}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Policy Generator */}
      {activeTab === 'policy' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Gerador de Políticas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Política *</label>
              <select className={sel} value={policyForm.policyType} onChange={e => setPolicyForm(p => ({ ...p, policyType: e.target.value }))}>
                <option value="">Selecionar...</option>
                {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework de referência</label>
              <select className={sel} value={policyForm.framework} onChange={e => setPolicyForm(p => ({ ...p, framework: e.target.value }))}>
                {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => policyMutation.mutate()} disabled={!policyForm.policyType || policyMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {policyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {policyMutation.isPending ? 'A gerar política...' : 'Gerar Política com IA'}
          </button>
          {policyResult && <ResultCard title={`Política: ${policyForm.policyType} (${policyForm.framework})`} content={policyResult} onDownload={() => downloadText(policyResult, `politica-${policyForm.policyType.toLowerCase().replace(/\s+/g, '-')}.txt`)} />}
        </div>
      )}

      {/* Gap Analysis */}
      {activeTab === 'gap' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Search className="w-4 h-4 text-purple-600" /> Análise de Gap Automática</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework a analisar</label>
            <select className={sel} value={gapForm.framework} onChange={e => setGapForm(p => ({ ...p, framework: e.target.value }))}>
              {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button onClick={() => gapMutation.mutate()} disabled={gapMutation.isPending}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {gapMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {gapMutation.isPending ? 'A analisar gaps...' : 'Analisar Gaps com IA'}
          </button>
          {gapResult && <ResultCard title={`Gap Analysis: ${gapForm.framework}`} content={gapResult} onDownload={() => downloadText(gapResult, `gap-analysis-${gapForm.framework.toLowerCase().replace(/\s+/g, '-')}.txt`)} />}
        </div>
      )}

      {/* Audit Prep */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-green-600" /> Preparação de Auditoria</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework</label>
              <select className={sel} value={auditForm.framework} onChange={e => setAuditForm(p => ({ ...p, framework: e.target.value }))}>
                {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Auditoria</label>
              <select className={sel} value={auditForm.auditType} onChange={e => setAuditForm(p => ({ ...p, auditType: e.target.value }))}>
                {AUDIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
            {auditMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {auditMutation.isPending ? 'A preparar checklist...' : 'Gerar Checklist de Auditoria'}
          </button>
          {auditResult && <ResultCard title={`Preparação: ${auditForm.auditType} ${auditForm.framework}`} content={auditResult} onDownload={() => downloadText(auditResult, `audit-prep-${auditForm.framework.toLowerCase().replace(/\s+/g, '-')}.txt`)} />}
        </div>
      )}
    </div>
  );
}
