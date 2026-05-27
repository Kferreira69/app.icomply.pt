'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { orgApi } from '@/lib/api';
import { Loader2, Save, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function OrganizationSettingsPage() {
  const t = useTranslations('orgPage');
  const qc = useQueryClient();

  const INDUSTRY_OPTIONS = [
    { value: 'TECHNOLOGY', label: t('industry.TECHNOLOGY') },
    { value: 'FINANCIAL_SERVICES', label: t('industry.FINANCIAL_SERVICES') },
    { value: 'HEALTHCARE', label: t('industry.HEALTHCARE') },
    { value: 'MANUFACTURING', label: t('industry.MANUFACTURING') },
    { value: 'RETAIL', label: t('industry.RETAIL') },
    { value: 'ENERGY', label: t('industry.ENERGY') },
    { value: 'EDUCATION', label: t('industry.EDUCATION') },
    { value: 'GOVERNMENT', label: t('industry.GOVERNMENT') },
    { value: 'TELECOMMUNICATIONS', label: t('industry.TELECOMMUNICATIONS') },
    { value: 'OTHER', label: t('industry.OTHER') },
  ];

  const SIZE_OPTIONS = [
    { value: 'MICRO', label: t('size.MICRO') },
    { value: 'SMALL', label: t('size.SMALL') },
    { value: 'MEDIUM', label: t('size.MEDIUM') },
    { value: 'LARGE', label: t('size.LARGE') },
    { value: 'ENTERPRISE', label: t('size.ENTERPRISE') },
  ];

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
              <h2 className="text-base font-semibold text-gray-900">{t('basicInfoTitle')}</h2>
              <p className="text-xs text-gray-400">{t('basicInfoSubtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('orgName')} *</label>
              <input
                {...register('name', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('slug')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sector')}</label>
                <select
                  {...register('industry')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">{t('select')}</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orgSize')}</label>
                <select
                  {...register('size')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">{t('select')}</option>
                  {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('country')}</label>
                <input
                  {...register('country')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="PT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('website')}</label>
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
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('fiscalTitle')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('vatNumber')}</label>
              <input
                {...register('vatNumber')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="PT000000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
              <input
                {...register('address')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder={t('addressPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('billingEmail')}</label>
              <input
                {...register('billingEmail')}
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder={t('billingEmailPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Plan Info (read-only) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('planTitle')}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{t('planCurrent')}</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{org?.plan || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{t('planUsers')}</p>
              <p className="text-sm font-semibold text-gray-900">{org?.maxUsers || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{t('planStatus')}</p>
              <p className="text-sm font-semibold text-green-600">{org?.isActive ? t('active') : t('inactive')}</p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {updateMutation.isSuccess && (
            <p className="text-sm text-green-600">{t('saveSuccess')}</p>
          )}
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}
