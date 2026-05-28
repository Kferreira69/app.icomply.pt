'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgProfileApi } from '@/lib/api';
import {
  MapPin, Phone, DollarSign, Shield, Lock, Brain,
  HeartPulse, Briefcase, Loader2, CheckCircle, Edit2, Save, X, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTORS = [
  'TECHNOLOGY','FINANCIAL_SERVICES','HEALTHCARE','MANUFACTURING',
  'RETAIL','ENERGY','REAL_ESTATE','LEGAL','CONSULTING',
  'EDUCATION','PUBLIC_SECTOR','MEDIA','LOGISTICS','OTHER',
];
const SIZES = ['MICRO','SMALL','MEDIUM','LARGE','ENTERPRISE'];

const CONTACT_ROLES = [
  { key: 'GENERAL',            label: 'Contacto Geral',          icon: Phone,       color: 'text-gray-600'   },
  { key: 'BILLING',            label: 'Contacto Financeiro',     icon: DollarSign,  color: 'text-green-600'  },
  { key: 'DPO',                label: 'DPO (Data Protection)',   icon: Shield,      color: 'text-blue-600'   },
  { key: 'COMPLIANCE_OFFICER', label: 'Compliance Officer',      icon: Briefcase,   color: 'text-indigo-600' },
  { key: 'SECURITY_OFFICER',   label: 'Security Officer (CISO)', icon: Lock,        color: 'text-red-600'    },
  { key: 'AML_OFFICER',        label: 'AML Officer',             icon: Shield,      color: 'text-orange-600' },
  { key: 'AI_GOVERNANCE_LEAD', label: 'AI Governance Lead',      icon: Brain,       color: 'text-purple-600' },
  { key: 'HR_LEAD',            label: 'HR Lead',                 icon: HeartPulse,  color: 'text-pink-600'   },
];

const ADDRESS_TYPES = [
  { key: 'HQ',          label: 'Sede (HQ)'   },
  { key: 'BILLING',     label: 'Faturação'   },
  { key: 'OPERATIONAL', label: 'Operacional' },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors';

export default function OrganizationProfilePage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['org-profile'],
    queryFn: () => orgProfileApi.getProfile().then(r => r.data),
  });
  const { data: addresses = [] } = useQuery({
    queryKey: ['org-addresses'],
    queryFn: () => orgProfileApi.listAddresses().then(r => r.data),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['org-contacts'],
    queryFn: () => orgProfileApi.listContacts().then(r => r.data),
  });

  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [editAddr, setEditAddr]       = useState<any>(null);
  const [editContact, setEditContact] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        legalName:     profile.legalName    ?? '',
        tradeName:     profile.tradeName    ?? '',
        industry:      profile.industry     ?? '',
        size:          profile.size         ?? '',
        country:       profile.country      ?? 'PT',
        vatNumber:     profile.vatNumber    ?? '',
        employeeCount: profile.employeeCount ?? '',
        annualRevenue: profile.annualRevenue ?? '',
        groupName:     profile.groupName    ?? '',
        website:       profile.website      ?? '',
        phone:         profile.phone        ?? '',
        billingEmail:  profile.billingEmail ?? '',
      });
    }
  }, [profile?.id]);

  const updateMutation = useMutation({
    mutationFn: (d: any) => orgProfileApi.updateProfile(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['org-profile'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const addrMutation = useMutation({
    mutationFn: (d: any) => orgProfileApi.upsertAddress(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['org-addresses'] }); setEditAddr(null); },
  });
  const removeAddrMutation = useMutation({
    mutationFn: (id: string) => orgProfileApi.removeAddress(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['org-addresses'] }); setEditAddr(null); },
  });

  const contactMutation = useMutation({
    mutationFn: (d: any) => orgProfileApi.upsertContact(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['org-contacts'] }); setEditContact(null); },
  });
  const removeContactMutation = useMutation({
    mutationFn: (id: string) => orgProfileApi.removeContact(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['org-contacts'] }); setEditContact(null); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const f = (k: string) => form[k] ?? '';
  const s = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="max-w-3xl space-y-6">

      {/* ── Identification ──────────────────────────────────── */}
      <Section title="Identificação da Organização">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Nome Legal *', key: 'legalName',     ph: 'Nome legal completo',       type: 'text' },
            { label: 'Nome Comercial', key: 'tradeName',   ph: 'Nome comercial / marca',    type: 'text' },
            { label: 'NIF / VAT',    key: 'vatNumber',     ph: 'PT999999990',               type: 'text' },
            { label: 'País',         key: 'country',       ph: 'PT',                        type: 'text' },
            { label: 'Grupo Empresarial', key: 'groupName', ph: 'Nome do grupo (se aplic.)', type: 'text' },
            { label: 'Website',      key: 'website',       ph: 'https://empresa.pt',        type: 'url'  },
            { label: 'Telefone Geral', key: 'phone',       ph: '+351 21X XXX XXXX',         type: 'tel'  },
            { label: 'Email Faturação', key: 'billingEmail', ph: 'financeiro@empresa.pt',   type: 'email' },
          ].map(({ label, key, ph, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
              <input type={type} className={inp} value={f(key)} onChange={e => s(key, e.target.value)} placeholder={ph} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Setor de Atividade</label>
            <select className={inp} value={f('industry')} onChange={e => s('industry', e.target.value)}>
              <option value="">Selecionar...</option>
              {SECTORS.map(x => <option key={x} value={x}>{x.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Dimensão</label>
            <select className={inp} value={f('size')} onChange={e => s('size', e.target.value)}>
              <option value="">Selecionar...</option>
              {SIZES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nº de Trabalhadores</label>
            <input type="number" className={inp} value={f('employeeCount')} onChange={e => s('employeeCount', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Volume de Negócios (€/ano)</label>
            <input type="number" className={inp} value={f('annualRevenue')} onChange={e => s('annualRevenue', e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Guardado!' : 'Guardar'}
          </button>
        </div>
      </Section>

      {/* ── Addresses ──────────────────────────────────────── */}
      <Section title="Moradas" description="Defina a morada de sede, faturação e operacional.">
        <div className="space-y-3">
          {ADDRESS_TYPES.map(({ key, label }) => {
            const existing = (addresses as any[]).find(a => a.type === key);
            const isEdit   = editAddr?.type === key;
            return (
              <div key={key} className={cn('border rounded-xl p-4', isEdit ? 'border-primary bg-blue-50/30' : 'border-gray-100')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {existing && <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Definida</span>}
                  </div>
                  <button onClick={() => setEditAddr(isEdit ? null : (existing || { type: key, street: '', city: '', postalCode: '', region: '', country: 'PT' }))}
                    className="text-xs text-primary flex items-center gap-1 hover:underline">
                    {isEdit ? <><X className="w-3 h-3" />Cancelar</> : <><Edit2 className="w-3 h-3" />{existing ? 'Editar' : 'Adicionar'}</>}
                  </button>
                </div>
                {!isEdit && existing && (
                  <p className="text-xs text-gray-400 mt-1">{[existing.street, existing.city, existing.postalCode, existing.region, existing.country].filter(Boolean).join(', ')}</p>
                )}
                {isEdit && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="col-span-2"><input className={inp} value={editAddr.street || ''} onChange={e => setEditAddr((p: any) => ({ ...p, street: e.target.value }))} placeholder="Rua / Avenida, Nº, Andar" /></div>
                    <input className={inp} value={editAddr.city || ''} onChange={e => setEditAddr((p: any) => ({ ...p, city: e.target.value }))} placeholder="Cidade" />
                    <input className={inp} value={editAddr.postalCode || ''} onChange={e => setEditAddr((p: any) => ({ ...p, postalCode: e.target.value }))} placeholder="Código Postal" />
                    <input className={inp} value={editAddr.region || ''} onChange={e => setEditAddr((p: any) => ({ ...p, region: e.target.value }))} placeholder="Distrito / Região" />
                    <input className={inp} value={editAddr.country || 'PT'} onChange={e => setEditAddr((p: any) => ({ ...p, country: e.target.value }))} placeholder="País (ex: PT)" maxLength={2} />
                    <div className="col-span-2 flex justify-end gap-2">
                      {existing && <button onClick={() => removeAddrMutation.mutate(existing.id)} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><Trash2 className="w-3 h-3" />Remover</button>}
                      <button onClick={() => addrMutation.mutate(editAddr)} disabled={addrMutation.isPending} className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                        {addrMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Compliance Officers ─────────────────────────────── */}
      <Section title="Compliance & Governance Officers"
        description="Estes contactos alimentam workflows, notificações e atribuições de responsabilidade de governance em toda a plataforma.">
        <div className="space-y-3">
          {CONTACT_ROLES.map(({ key, label, icon: Icon, color }) => {
            const existing = (contacts as any[]).find(c => c.role === key);
            const isEdit   = editContact?.role === key;
            return (
              <div key={key} className={cn('border rounded-xl p-4', isEdit ? 'border-primary bg-blue-50/30' : 'border-gray-100')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', color)} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {existing && <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{existing.name}</span>}
                  </div>
                  <button onClick={() => setEditContact(isEdit ? null : (existing || { role: key, name: '', title: '', email: '', phone: '' }))}
                    className="text-xs text-primary flex items-center gap-1 hover:underline">
                    {isEdit ? <><X className="w-3 h-3" />Cancelar</> : <><Edit2 className="w-3 h-3" />{existing ? 'Editar' : 'Designar'}</>}
                  </button>
                </div>
                {!isEdit && existing && (
                  <p className="text-xs text-gray-400">{[existing.title, existing.email, existing.phone].filter(Boolean).join(' · ')}</p>
                )}
                {isEdit && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <input className={inp} value={editContact.name || ''} onChange={e => setEditContact((p: any) => ({ ...p, name: e.target.value }))} placeholder="Nome completo *" />
                    <input className={inp} value={editContact.title || ''} onChange={e => setEditContact((p: any) => ({ ...p, title: e.target.value }))} placeholder="Cargo / Título" />
                    <input type="email" className={inp} value={editContact.email || ''} onChange={e => setEditContact((p: any) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                    <input className={inp} value={editContact.phone || ''} onChange={e => setEditContact((p: any) => ({ ...p, phone: e.target.value }))} placeholder="Telefone" />
                    <div className="col-span-2 flex justify-end gap-2">
                      {existing && <button onClick={() => removeContactMutation.mutate(existing.id)} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><Trash2 className="w-3 h-3" />Remover</button>}
                      <button onClick={() => contactMutation.mutate(editContact)} disabled={contactMutation.isPending} className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                        {contactMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

    </div>
  );
}
