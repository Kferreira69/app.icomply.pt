'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '@/lib/api';
import { Loader2, Save, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

const INDUSTRY_OPTIONS = [
  { value: 'TECHNOLOGY', label: 'Tecnologia' },
  { value: 'FINANCIAL_SERVICES', label: 'Serviços Financeiros' },
  { value: 'HEALTHCARE', label: 'Saúde' },
  { value: 'MANUFACTURING', label: 'Indústria' },
  { value: 'RETAIL', label: 'Retalho' },
  { value: 'ENERGY', label: 'Energia' },
  { value: 'EDUCATION', label: 'Educação' },
  { value: 'GOVERNMENT', label: 'Governo / Setor Público' },
  { value: 'TELECOMMUNICATIONS', label: 'Telecomunicações' },
  { value: 'OTHER', label: 'Outro' },
];

const SIZE_OPTIONS = [
  { value: 'MICRO', label: 'Micro (< 10 colaboradores)' },
  { value: 'SMALL', label: 'Pequena (10–49)' },
  { value: 'MEDIUM', label: 'Média (50–249)' },
  { value: 'LARGE', label: 'Grande (250–999)' },
  { value: 'ENTERPRISE', label: 'Enterprise (≥ 1000)' },
];

export default function OrganizationSettingsPage() {
  const qc = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => orgApi.getCurrent().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        size: org.size,
        country: org.country,
        website: org.website,
        vatNumber: org.vatNumber,
        address: org.address,
        billingEmail: org.billingEmail,
      });
    }
  }, [org, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => orgApi.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organization'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Informação da Organização</h2>
              <p className="text-xs text-gray-400">Dados gerais da sua organização</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Organização *</label>
              <input
                {...register('name', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 bg-gray-50 border border-gray-300 rounded-l-lg px-3 py-2">app.icomply.pt/</span>
                <input
                  {...register('slug')}
                  className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none border-l-0"
                  readOnly
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                <select
                  {...register('industry')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Selecionar...</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensão</label>
                <select
                  {...register('size')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Selecionar...</option>
                  {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <input
                  {...register('country')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="PT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  {...register('website')}
                  type="url"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fiscal Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Dados Fiscais e Faturação</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIF / VAT Number</label>
              <input
                {...register('vatNumber')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="PT000000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Morada</label>
              <input
                {...register('address')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Rua, Número, Código Postal, Cidade"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Faturação</label>
              <input
                {...register('billingEmail')}
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="faturacao@empresa.pt"
              />
            </div>
          </div>
        </div>

        {/* Plan Info (read-only) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Plano e Subscrição</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Plano Atual</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{org?.plan || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Utilizadores</p>
              <p className="text-sm font-semibold text-gray-900">{org?.maxUsers || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Estado</p>
              <p className="text-sm font-semibold text-green-600">{org?.isActive ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {updateMutation.isSuccess && (
            <p className="text-sm text-green-600">Alterações guardadas com sucesso.</p>
          )}
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
