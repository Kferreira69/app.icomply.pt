import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true, // send & receive HttpOnly cookies
});

// ── Request interceptor: attach JWT ─────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: handle 401 / token refresh ────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data;
          setTokens(accessToken, refreshToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          logout();
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
      } else {
        logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API helpers ────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  acceptInvite: (data: { token: string; password: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/accept-invite', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }),
  // 2FA
  get2FAStatus:  ()              => api.get('/auth/2fa/status'),
  setup2FA:      ()              => api.post('/auth/2fa/setup', {}),
  verify2FA:     (token: string) => api.post('/auth/2fa/verify', { token }),
  disable2FA:    (token: string) => api.post('/auth/2fa/disable', { token }),
  validate2FA:   (token: string) => api.post('/auth/2fa/validate', { token }),
};

export const orgApi = {
  getCurrent: () => api.get('/organizations/my'),
  myOrg: () => api.get('/organizations/my'),
  dashboard: () => api.get('/organizations/my/dashboard'),
  update: (data: any) => api.patch('/organizations/my', data),
};

export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  invite: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  suspend: (id: string) => api.patch(`/users/${id}/suspend`),
  reactivate: (id: string) => api.patch(`/users/${id}/reactivate`),
  setPassword: (id: string, password: string) => api.post(`/users/${id}/set-password`, { password }),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/users/me/change-password', { currentPassword, newPassword }),
  resendInvite: (id: string) => api.post(`/users/${id}/resend-invite`),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/me/avatar', form);
  },
};

export const frameworksApi = {
  list: () => api.get('/frameworks'),
  get: (id: string) => api.get(`/frameworks/${id}`),
  controls: (id: string) => api.get(`/frameworks/${id}/controls`),
  templates: (id: string) => api.get(`/frameworks/${id}/templates`),
};

export const diagnosticsApi = {
  questions: () => api.get('/diagnostics/questions'),
  startRun: (data?: any) => api.post('/diagnostics/runs', data || {}),
  listRuns: () => api.get('/diagnostics/runs'),
  getRun: (id: string) => api.get(`/diagnostics/runs/${id}`),
  submitAnswers: (runId: string, data: any) =>
    api.post(`/diagnostics/runs/${runId}/answers`, data),
};

export const projectsApi = {
  list: (params?: any) => api.get('/projects', { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  getOne: (id: string) => api.get(`/projects/${id}`),
  stats: (id: string) => api.get(`/projects/${id}/stats`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data),
};

export const tasksApi = {
  list: (params?: any) => api.get('/tasks', { params }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  addComment: (id: string, content: string) =>
    api.post(`/tasks/${id}/comments`, { content }),
  bulkUpdateStatus: (ids: string[], status: string) =>
    api.patch('/tasks/bulk/status', { ids, status }),
  addDependency: (id: string, blockingTaskId: string) =>
    api.post(`/tasks/${id}/dependencies`, { blockingTaskId }),
  removeDependency: (id: string, blockingTaskId: string) =>
    api.delete(`/tasks/${id}/dependencies/${blockingTaskId}`),
};

export const risksApi = {
  list:            (params?: any)             => api.get('/risks', { params }),
  get:             (id: string)               => api.get(`/risks/${id}`),
  heatmap:         ()                         => api.get('/risks/heatmap'),
  create:          (data: any)                => api.post('/risks', data),
  update:          (id: string, data: any)    => api.patch(`/risks/${id}`, data),
  updateTreatment: (id: string, data: any)    => api.patch(`/risks/${id}/treatment`, data),
  acceptRisk:      (id: string, data: any)    => api.post(`/risks/${id}/accept`, data),
  history:         (id: string)               => api.get(`/risks/${id}/history`),
};

export const evidenceApi = {
  list: (params?: any) => api.get('/evidence', { params }),
  get: (id: string) => api.get(`/evidence/${id}`),
  gapAnalysis: (frameworkId: string) =>
    api.get('/evidence/gap-analysis', { params: { frameworkId } }),
  upload: (formData: FormData) =>
    api.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus:  (id: string, status: string)         => api.patch(`/evidence/${id}/status`, { status }),
  bulkStatus:    (ids: string[], status: string)       => api.patch('/evidence/bulk/status', { ids, status }),
};

export const auditsApi = {
  list: (params?: any) => api.get('/audits', { params }),
  get: (id: string) => api.get(`/audits/${id}`),
  getOne: (id: string) => api.get(`/audits/${id}`),
  create: (data: any) => api.post('/audits', data),
  update: (id: string, data: any) => api.patch(`/audits/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/audits/${id}/status`, data),
  createFinding: (auditId: string, data: any) =>
    api.post(`/audits/${auditId}/findings`, data),
  updateFinding: (auditId: string, findingId: string, data: any) =>
    api.patch(`/audits/${auditId}/findings/${findingId}`, data),
};

export const capaApi = {
  list: (params?: any) => api.get('/capa', { params }),
  get: (id: string) => api.get(`/capa/${id}`),
  create: (data: any) => api.post('/capa', data),
  update: (id: string, data: any) => api.patch(`/capa/${id}`, data),
};

export const reportsApi = {
  list:            ()                           => api.get('/reports'),
  summary:         (projectId?: string)         => api.get('/reports/summary', { params: { projectId } }),
  generate:        (data: any)                  => api.post('/reports/generate', data),
  download:        (id: string)                 => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  listSchedules:   ()                           => api.get('/reports/schedules/list'),
  createSchedule:  (data: any)                  => api.post('/reports/schedules', data),
  updateSchedule:  (id: string, data: any)      => api.put(`/reports/schedules/${id}`, data),
  removeSchedule:  (id: string)                 => api.delete(`/reports/schedules/${id}`),
};

export const excelImportApi = {
  upload: (file: File, type: string, projectId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (projectId) formData.append('projectId', projectId);
    return api.post('/excel-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadForm: (formData: FormData) =>
    api.post('/excel-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: (params?: any) => api.get('/excel-import/history', { params }),
  history: () => api.get('/excel-import/history'),
  status: (id: string) => api.get(`/excel-import/${id}`),
  downloadTemplate: (type: string) =>
    api.get('/excel-import/template', { params: { type }, responseType: 'blob' }),
  template: (type: string) =>
    api.get('/excel-import/template', { params: { type }, responseType: 'blob' }),
};

export const auditLogsApi = {
  list: (params?: any) => api.get('/audit-logs', { params }),
};

export const notificationsApi = {
  list:              (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => api.get('/notifications', { params }),
  unreadCount:       ()              => api.get('/notifications/unread-count'),
  markAsRead:        (id: string)    => api.patch(`/notifications/${id}/read`),
  markAllAsRead:     ()              => api.patch('/notifications/read-all'),
  remove:            (id: string)    => api.delete(`/notifications/${id}`),
  getPreferences:    ()              => api.get('/notifications/preferences'),
  updatePreferences: (preferences: Array<{ type: string; inApp: boolean; email: boolean }>) =>
    api.patch('/notifications/preferences', { preferences }),
};

// ── Vendor Questionnaires ─────────────────────────────────────

export const vendorQuestionnaireApi = {
  create:       (vendorId: string, data: any) => api.post(`/vendor-questionnaires/vendors/${vendorId}`, data),
  list:         (vendorId: string)            => api.get(`/vendor-questionnaires/vendors/${vendorId}`),
  getPublic:    (token: string)               => fetch(`${BASE_URL}/vendor-questionnaires/public/${token}`).then(r => r.json()),
  submitPublic: (token: string, data: any)    => fetch(`${BASE_URL}/vendor-questionnaires/public/${token}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),
};

export const policiesApi = {
  list: (params?: { status?: string; category?: string }) => api.get('/policies', { params }),
  get: (id: string) => api.get(`/policies/${id}`),
  stats: () => api.get('/policies/stats'),
  create: (data: any) => api.post('/policies', data),
  update: (id: string, data: any) => api.patch(`/policies/${id}`, data),
  remove: (id: string) => api.delete(`/policies/${id}`),
  submitForReview: (id: string) => api.post(`/policies/${id}/submit`),
  approve: (id: string) => api.post(`/policies/${id}/approve`),
  archive: (id: string) => api.post(`/policies/${id}/archive`),
  revertToDraft: (id: string) => api.post(`/policies/${id}/revert`),
  acknowledge: (id: string) => api.post(`/policies/${id}/acknowledge`),
  acknowledgmentStatus: (id: string) => api.get(`/policies/${id}/acknowledgment-status`),
};

export const gdprApi = {
  dashboard: () => api.get('/gdpr/dashboard'),
  // ROPA / Processing Activities
  activities: {
    list: (params?: { status?: string }) => api.get('/gdpr/activities', { params }),
    get: (id: string) => api.get(`/gdpr/activities/${id}`),
    create: (data: any) => api.post('/gdpr/activities', data),
    update: (id: string, data: any) => api.patch(`/gdpr/activities/${id}`, data),
    remove: (id: string) => api.delete(`/gdpr/activities/${id}`),
    ropaReport: () => api.get('/gdpr/activities/ropa-report'),
  },
  // DPIAs
  dpias: {
    list: (params?: { status?: string }) => api.get('/gdpr/dpias', { params }),
    get: (id: string) => api.get(`/gdpr/dpias/${id}`),
    create: (data: any) => api.post('/gdpr/dpias', data),
    update: (id: string, data: any) => api.patch(`/gdpr/dpias/${id}`, data),
    remove: (id: string) => api.delete(`/gdpr/dpias/${id}`),
  },
  // Breach Notifications
  breaches: {
    list: () => api.get('/gdpr/breaches'),
    get: (id: string) => api.get(`/gdpr/breaches/${id}`),
    create: (data: any) => api.post('/gdpr/breaches', data),
    update: (id: string, data: any) => api.patch(`/gdpr/breaches/${id}`, data),
    remove: (id: string) => api.delete(`/gdpr/breaches/${id}`),
  },
  // DSAR — Data Subject Access Requests
  dsar: {
    stats:        ()                        => api.get('/gdpr/dsar/stats'),
    list:         (params?: { status?: string }) => api.get('/gdpr/dsar', { params }),
    get:          (id: string)              => api.get(`/gdpr/dsar/${id}`),
    create:       (data: any)               => api.post('/gdpr/dsar', data),
    update:       (id: string, data: any)   => api.patch(`/gdpr/dsar/${id}`, data),
    remove:       (id: string)              => api.delete(`/gdpr/dsar/${id}`),
    publicInfo:   (orgSlug: string)         => fetch(`${BASE_URL}/gdpr/dsar/public/${orgSlug}`).then(r => r.json()),
    submitPublic: (orgSlug: string, data: any) => fetch(`${BASE_URL}/gdpr/dsar/public/${orgSlug}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  },
  // Consent Records
  consent: {
    list: (params?: { status?: string }) => api.get('/gdpr/consent', { params }),
    get: (id: string) => api.get(`/gdpr/consent/${id}`),
    create: (data: any) => api.post('/gdpr/consent', data),
    update: (id: string, data: any) => api.patch(`/gdpr/consent/${id}`, data),
    withdraw: (id: string) => api.post(`/gdpr/consent/${id}/withdraw`, {}),
    remove: (id: string) => api.delete(`/gdpr/consent/${id}`),
  },
};

export const nis2Api = {
  dashboard: () => api.get('/nis2/dashboard'),
  updateMeasure: (measureCode: string, data: any) => api.patch(`/nis2/measures/${measureCode}`, data),
  bulkUpdate: (updates: Array<{ measureCode: string; status: string }>) =>
    api.patch('/nis2/measures', { updates }),
};


export const vendorsApi = {
  dashboard: () => api.get('/vendors/dashboard'),
  list: (params?: {
    status?: string; riskLevel?: string; category?: string;
    dataProcessor?: string; unassessed?: string;
    page?: number; limit?: number;
  }) => api.get('/vendors', { params }),
  get: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.patch(`/vendors/${id}`, data),
  remove: (id: string) => api.delete(`/vendors/${id}`),
  addAssessment: (id: string, data: { score: number; findings?: string }) =>
    api.post(`/vendors/${id}/assessments`, data),
  exportCsv: () => api.get('/vendors/export/csv', { responseType: 'blob' }),
};

export const soaApi = {
  dashboard: () => api.get('/soa/dashboard'),
  list: (theme?: string) => api.get('/soa', { params: theme ? { theme } : {} }),
  update: (controlCode: string, data: any) => api.patch(`/soa/${encodeURIComponent(controlCode)}`, data),
  bulkUpdate: (updates: any[]) => api.patch('/soa/bulk', { updates }),
  exportCsv: () => api.get('/soa/export/csv', { responseType: 'blob' }),
};

export const doraApi = {
  dashboard: () => api.get('/dora/dashboard'),
  // Incidents
  listIncidents: (params?: { severity?: string; status?: string; category?: string }) =>
    api.get('/dora/incidents', { params }),
  getIncident: (id: string) => api.get(`/dora/incidents/${id}`),
  createIncident: (data: any) => api.post('/dora/incidents', data),
  updateIncident: (id: string, data: any) => api.patch(`/dora/incidents/${id}`, data),
  deleteIncident: (id: string) => api.delete(`/dora/incidents/${id}`),
  // Tests
  listTests: (params?: { testType?: string; status?: string }) =>
    api.get('/dora/tests', { params }),
  createTest: (data: any) => api.post('/dora/tests', data),
  updateTest: (id: string, data: any) => api.patch(`/dora/tests/${id}`, data),
  deleteTest: (id: string) => api.delete(`/dora/tests/${id}`),
};

export const whistleblowApi = {
  // Public (no auth)
  submit: (orgSlug: string, data: any) =>
    api.post(`/whistleblow/submit/${orgSlug}`, data),
  checkStatus: (token: string) =>
    api.get(`/whistleblow/status/${token}`),

  // Protected
  dashboard: () => api.get('/whistleblow/dashboard'),
  listReports: (params?: any) => api.get('/whistleblow/reports', { params }),
  getReport: (id: string) => api.get(`/whistleblow/reports/${id}`),
  updateReport: (id: string, data: any) =>
    api.patch(`/whistleblow/reports/${id}`, data),
  addNote: (id: string, note: string) =>
    api.post(`/whistleblow/reports/${id}/notes`, { note }),
  menacReport: (year?: number) =>
    api.get('/whistleblow/menac', { params: year ? { year } : {} }),

  // Code of Conduct
  listConduct: () => api.get('/whistleblow/conduct'),
  getConduct: (id: string) => api.get(`/whistleblow/conduct/${id}`),
  createConduct: (data: any) => api.post('/whistleblow/conduct', data),
  updateConduct: (id: string, data: any) =>
    api.patch(`/whistleblow/conduct/${id}`, data),
  acknowledgeConduct: (id: string) =>
    api.post(`/whistleblow/conduct/${id}/acknowledge`),

  // Training
  listTrainings: () => api.get('/whistleblow/trainings'),
  createTraining: (data: any) => api.post('/whistleblow/trainings', data),
  updateTraining: (id: string, data: any) =>
    api.patch(`/whistleblow/trainings/${id}`, data),
  markAttendance: (
    trainingId: string,
    userId: string,
    data: { attended: boolean; score?: number; certificateUrl?: string },
  ) => api.patch(`/whistleblow/trainings/${trainingId}/attendance/${userId}`, data),
};

export const trustCenterApi = {
  getPublic: (slug: string) => api.get(`/trust-center/public/${slug}`),
  getSettings: () => api.get('/trust-center/settings'),
  updateSettings: (data: any) => api.patch('/trust-center/settings', data),
};

export const permissionsApi = {
  getMyPermissions: () => api.get('/permissions/me'),
  getUserPermissions: (userId: string) => api.get(`/permissions/${userId}`),
  setUserPermissions: (userId: string, permissions: Array<{ module: string; level: number }>) =>
    api.put(`/permissions/${userId}`, { permissions }),
};

export const aiAssistantApi = {
  chat:           (messages: Array<{ role: 'user' | 'assistant'; content: string }>, currentModule?: string) =>
    api.post('/ai-assistant/chat', { messages, currentModule }),
  generatePolicy: (data: { policyType: string; framework: string; language?: string }) =>
    api.post('/ai-assistant/generate-policy', data),
  gapAnalysis:    (data: { framework: string }) =>
    api.post('/ai-assistant/gap-analysis', data),
  auditPrep:      (data: { framework: string; auditType: string }) =>
    api.post('/ai-assistant/audit-prep', data),
};

export const translationsApi = {
  listOverrides: (locale?: string) =>
    api.get('/translations', { params: locale ? { locale } : {} }),
  getOverridesMap: (locale: string) =>
    api.get('/translations/overrides', { params: { locale } }),
  upsertOverride: (locale: string, key: string, value: string) =>
    api.put(`/translations/${locale}/${encodeURIComponent(key)}`, { value }),
  deleteOverride: (locale: string, key: string) =>
    api.delete(`/translations/${locale}/${encodeURIComponent(key)}`),
  translate: (key: string, text: string, targetLang: string, save = false) =>
    api.post('/translations/translate', { key, text, targetLang, save }),
  translateBatch: (texts: string[], targetLang: string, sourceLang = 'PT') =>
    api.post('/translations/translate/batch', { texts, targetLang, sourceLang }),
};

// ── Licensing (backoffice + self-service) ─────────────────────

export const licensingApi = {
  catalogue:       ()                               => api.get('/licensing/catalogue'),
  myLicense:       ()                               => api.get('/licensing/my'),
  myAddons:        ()                               => api.get('/licensing/my/addons'),
  myEvents:        ()                               => api.get('/licensing/my/events'),
  myFlags:         ()                               => api.get('/licensing/my/feature-flags'),
  stripeCheckout:  (data: { plan: string; billingCycle: string }) => api.post('/licensing/stripe/checkout', data),
  stripePortal:    ()                               => api.post('/licensing/stripe/portal', {}),
  stats:           ()                               => api.get('/licensing/stats'),
  listClients:     ()                               => api.get('/licensing/clients'),
  getClient:       (orgId: string)                  => api.get(`/licensing/clients/${orgId}`),
  upsert:          (orgId: string, data: any)       => api.put(`/licensing/clients/${orgId}`, data),
  createInvoice:   (orgId: string, data: any)       => api.post(`/licensing/clients/${orgId}/invoices`, data),
  markPaid:        (invoiceId: string, data?: any)  => api.put(`/licensing/invoices/${invoiceId}/paid`, data || {}),
  toggleAddon:     (orgId: string, addonKey: string, enabled: boolean) => api.patch(`/licensing/clients/${orgId}/addons/${addonKey}`, { enabled }),
  setFeatureFlag:  (orgId: string, key: string, enabled: boolean, expiresAt?: string) => api.patch(`/licensing/clients/${orgId}/feature-flags/${key}`, { enabled, expiresAt }),
};

// ── Org Profile ───────────────────────────────────────────────

export const orgProfileApi = {
  getProfile:     ()             => api.get('/org-profile'),
  updateProfile:  (data: any)    => api.patch('/org-profile', data),
  listAddresses:  ()             => api.get('/org-profile/addresses'),
  upsertAddress:  (data: any)    => api.post('/org-profile/addresses', data),
  removeAddress:  (id: string)   => api.delete(`/org-profile/addresses/${id}`),
  listContacts:   ()             => api.get('/org-profile/contacts'),
  upsertContact:  (data: any)    => api.post('/org-profile/contacts', data),
  removeContact:  (id: string)   => api.delete(`/org-profile/contacts/${id}`),
};

// ── Webhooks ──────────────────────────────────────────────────

export const webhooksApi = {
  listEvents: ()              => api.get('/webhooks/events'),
  list:       ()              => api.get('/webhooks'),
  create:     (data: any)     => api.post('/webhooks', data),
  update:     (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  remove:     (id: string)    => api.delete(`/webhooks/${id}`),
};

// ── SSO ───────────────────────────────────────────────────────

export const ssoApi = {
  getConfig:    ()          => api.get('/sso'),
  upsertConfig: (data: any) => api.put('/sso', data),
  test:         ()          => api.post('/sso/test', {}),
  disable:      ()          => api.delete('/sso'),
};

// ── DORA Register of Information ─────────────────────────────

export const doraRegisterApi = {
  dashboard: ()                          => api.get('/dora-register/dashboard'),
  list:      (params?: any)              => api.get('/dora-register', { params }),
  create:    (data: any)                 => api.post('/dora-register', data),
  update:    (id: string, data: any)     => api.put(`/dora-register/${id}`, data),
  remove:    (id: string)                => api.delete(`/dora-register/${id}`),
  exportCsv: ()                          => api.get('/dora-register/export/csv', { responseType: 'blob' }),
};

// ── NIS2 Incident Notifications ──────────────────────────────

export const nis2IncidentsApi = {
  list:           ()                              => api.get('/nis2-incidents'),
  get:            (id: string)                    => api.get(`/nis2-incidents/${id}`),
  getNca:         ()                              => api.get('/nis2-incidents/nca'),
  create:         (data: any)                     => api.post('/nis2-incidents', data),
  update:         (id: string, data: any)         => api.put(`/nis2-incidents/${id}`, data),
  submit:         (id: string, type: string)      => api.post(`/nis2-incidents/${id}/submit/${type}`, {}),
  generateReport: (id: string, type: string)      => api.get(`/nis2-incidents/${id}/report/${type}`),
};

// ── Auditor Portal ────────────────────────────────────────────

export const auditorPortalApi = {
  listSessions:   ()                              => api.get('/auditor-portal/sessions'),
  createSession:  (data: any)                     => api.post('/auditor-portal/sessions', data),
  deactivate:     (id: string)                    => api.delete(`/auditor-portal/sessions/${id}`),
  resendInvite:   (id: string)                    => api.post(`/auditor-portal/sessions/${id}/resend`),
  respond:        (id: string, response: string)  => api.put(`/auditor-portal/requests/${id}/respond`, { response }),
  getPortal:      (token: string)                 => fetch(`${BASE_URL}/auditor-portal/public/${token}`).then(r => r.json()),
  createRequest:  (token: string, data: any)      => fetch(`${BASE_URL}/auditor-portal/public/${token}/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
};

// ── Management Body Liability ─────────────────────────────────

export const managementBodyApi = {
  getMembers:  ()                              => api.get('/management-body'),
  getSummary:  ()                              => api.get('/management-body/summary'),
  addMember:   (data: any)                     => api.post('/management-body', data),
  updateMember:(id: string, data: any)         => api.put(`/management-body/${id}`, data),
  removeMember:(id: string)                    => api.delete(`/management-body/${id}`),
  addAction:   (memberId: string, data: any)   => api.post(`/management-body/${memberId}/actions`, data),
  acknowledge: (actionId: string)              => api.put(`/management-body/actions/${actionId}/acknowledge`, {}),
};

// ── Board Reports ─────────────────────────────────────────────

export const boardReportsApi = {
  list:           ()                              => api.get('/board-reports'),
  get:            (id: string)                    => api.get(`/board-reports/${id}`),
  packData:       (id: string)                    => api.get(`/board-reports/${id}/pack-data`),
  create:         (data: any)                     => api.post('/board-reports', data),
  update:         (id: string, data: any)         => api.put(`/board-reports/${id}`, data),
  requestSignoff: (id: string, signers: any[])    => api.post(`/board-reports/${id}/request-signoff`, { signers }),
};

// ── Regulatory Intelligence Feed ──────────────────────────────

export const regulatoryFeedApi = {
  list:        (params?: any)   => api.get('/regulatory-feed', { params }),
  unreadCount: ()               => api.get('/regulatory-feed/unread-count'),
  markRead:    (id: string)     => api.put(`/regulatory-feed/${id}/read`, {}),
  markAllRead: ()               => api.put('/regulatory-feed/read-all', {}),
  seed:        ()               => api.post('/regulatory-feed/seed', {}),
};

// ── Client Hub ────────────────────────────────────────────────

export const clientHubApi = {
  getDashboard: ()              => api.get('/client-hub'),
  addClient:    (data: any)     => api.post('/client-hub', data),
  removeClient: (id: string)    => api.delete(`/client-hub/${id}`),
};

// ── Audit Templates ───────────────────────────────────────────

export const auditTemplatesApi = {
  list:   (framework?: string) => api.get('/audit-templates', { params: { framework } }),
  create: (data: any)          => api.post('/audit-templates', data),
  update: (id: string, data: any) => api.patch(`/audit-templates/${id}`, data),
  remove: (id: string)         => api.delete(`/audit-templates/${id}`),
};

// ── RACI Matrix ───────────────────────────────────────────────

export type RaciRole = 'R' | 'A' | 'C' | 'I';
export type RaciEntityType =
  | 'CONTROL' | 'RISK' | 'POLICY' | 'AUDIT' | 'CAPA'
  | 'PROCESS' | 'VENDOR' | 'INCIDENT' | 'BOARD_REPORT' | 'PROJECT' | 'TASK';

export const raciApi = {
  getForEntity: (entityType: RaciEntityType, entityId: string) =>
    api.get(`/raci/entity/${entityType}/${entityId}`),
  assign: (data: { entityType: RaciEntityType; entityId: string; userId: string; role: RaciRole; notes?: string }) =>
    api.post('/raci/assign', data),
  bulkSet: (entityType: RaciEntityType, entityId: string, assignments: Array<{ userId: string; role: RaciRole; notes?: string }>) =>
    api.post('/raci/bulk', { entityType, entityId, assignments }),
  remove: (id: string) => api.delete(`/raci/${id}`),
  getMyRoles: (entityType?: RaciEntityType) =>
    api.get('/raci/me', { params: entityType ? { entityType } : {} }),
  getForUser: (userId: string, entityType?: RaciEntityType) =>
    api.get(`/raci/user/${userId}`, { params: entityType ? { entityType } : {} }),
  getMatrix: (entityType: RaciEntityType) => api.get(`/raci/matrix/${entityType}`),
  getSummary: () => api.get('/raci/summary'),
};

// ── Approvals ────────────────────────────────────────────────

export type ApprovalEntityType =
  | 'POLICY' | 'CAPA' | 'AUDIT' | 'RISK' | 'BOARD_REPORT'
  | 'SOA_STATEMENT' | 'EVIDENCE' | 'PROJECT' | 'DOCUMENT';

export const approvalsApi = {
  create: (data: {
    entityType: ApprovalEntityType; entityId: string; title: string;
    description?: string; approverIds: string[]; threshold?: number; dueDate?: string;
  }) => api.post('/approvals', data),
  getForEntity: (entityType: ApprovalEntityType, entityId: string) =>
    api.get(`/approvals/entity/${entityType}/${entityId}`),
  getMyPending: () => api.get('/approvals/me'),
  getAll: (status?: string) => api.get('/approvals', { params: status ? { status } : {} }),
  getSummary: () => api.get('/approvals/summary'),
  vote: (id: string, decision: 'APPROVED' | 'REJECTED' | 'ABSTAIN', comment?: string) =>
    api.patch(`/approvals/${id}/vote`, { decision, comment }),
  cancel: (id: string) => api.patch(`/approvals/${id}/cancel`),
};

// ── Custom Roles ──────────────────────────────────────────────

export const orgRolesApi = {
  list:   ()              => api.get('/org-roles'),
  create: (data: any)     => api.post('/org-roles', data),
  update: (id: string, data: any) => api.put(`/org-roles/${id}`, data),
  remove: (id: string)    => api.delete(`/org-roles/${id}`),
};

// ── HR Compliance ─────────────────────────────────────────────

export const hrComplianceApi = {
  dashboard:       ()                               => api.get('/hr-compliance/dashboard'),
  // Salary bands
  listBands:       ()                               => api.get('/hr-compliance/salary-bands'),
  createBand:      (data: any)                      => api.post('/hr-compliance/salary-bands', data),
  updateBand:      (id: string, data: any)          => api.put(`/hr-compliance/salary-bands/${id}`, data),
  deleteBand:      (id: string)                     => api.delete(`/hr-compliance/salary-bands/${id}`),
  upsertPayGap:    (id: string, data: any)          => api.put(`/hr-compliance/salary-bands/${id}/pay-gap`, data),
  // SHST
  listShst:        (params?: any)                   => api.get('/hr-compliance/shst-incidents', { params }),
  createShst:      (data: any)                      => api.post('/hr-compliance/shst-incidents', data),
  updateShst:      (id: string, data: any)          => api.put(`/hr-compliance/shst-incidents/${id}`, data),
  // Training
  listTrainings:   (params?: any)                   => api.get('/hr-compliance/trainings', { params }),
  createTraining:  (data: any)                      => api.post('/hr-compliance/trainings', data),
  updateTraining:  (id: string, data: any)          => api.put(`/hr-compliance/trainings/${id}`, data),
  enroll:          (trainingId: string, userId: string) => api.post(`/hr-compliance/trainings/${trainingId}/enroll/${userId}`, {}),
  complete:        (enrollmentId: string, data: any) => api.put(`/hr-compliance/enrollments/${enrollmentId}/complete`, data),
  // Contracts
  listContracts:   (params?: any)                   => api.get('/hr-compliance/contracts', { params }),
  createContract:  (data: any)                      => api.post('/hr-compliance/contracts', data),
  updateContract:  (id: string, data: any)          => api.put(`/hr-compliance/contracts/${id}`, data),
  // Remote workers
  listRemote:      ()                               => api.get('/hr-compliance/remote-workers'),
  createRemote:    (data: any)                      => api.post('/hr-compliance/remote-workers', data),
  updateRemote:    (id: string, data: any)          => api.put(`/hr-compliance/remote-workers/${id}`, data),
};

// ── AI Governance ─────────────────────────────────────────────

export const aiGovernanceApi = {
  dashboard:        ()                      => api.get('/ai-governance/dashboard'),
  // AI Systems
  listSystems:      (params?: any)          => api.get('/ai-governance/systems', { params }),
  createSystem:     (data: any)             => api.post('/ai-governance/systems', data),
  updateSystem:     (id: string, data: any) => api.put(`/ai-governance/systems/${id}`, data),
  deleteSystem:     (id: string)            => api.delete(`/ai-governance/systems/${id}`),
  // AI Risks
  listRisks:        (params?: any)          => api.get('/ai-governance/risks', { params }),
  createRisk:       (data: any)             => api.post('/ai-governance/risks', data),
  updateRisk:       (id: string, data: any) => api.put(`/ai-governance/risks/${id}`, data),
  // Impact Assessments
  listAssessments:  ()                      => api.get('/ai-governance/assessments'),
  createAssessment: (data: any)             => api.post('/ai-governance/assessments', data),
  updateAssessment: (id: string, data: any) => api.put(`/ai-governance/assessments/${id}`, data),
  // ISO 42001
  getControls:      ()                      => api.get('/ai-governance/iso42001'),
  updateControl:    (id: string, data: any) => api.put(`/ai-governance/iso42001/${id}`, data),
  bulkUpdateControls: (updates: any[])      => api.put('/ai-governance/iso42001/bulk', { updates }),
};

// ── Unified Controls (Cross-Framework Engine) ─────────────────

export const unifiedControlsApi = {
  // Analytics
  dashboard:       ()                      => api.get('/unified-controls/dashboard'),
  coverageMatrix:  ()                      => api.get('/unified-controls/coverage-matrix'),
  gapImpact:       ()                      => api.get('/unified-controls/gap-impact'),
  // Controls
  list:            (params?: any)          => api.get('/unified-controls', { params }),
  create:          (data: any)             => api.post('/unified-controls', data),
  update:          (id: string, data: any) => api.put(`/unified-controls/${id}`, data),
  bulkUpdateStatus:(updates: any[])        => api.put('/unified-controls/bulk/status', { updates }),
  // Seed from catalogue
  seed:            (domains: string[])     => api.post('/unified-controls/seed', { domains }),
  // Evidence linking
  linkEvidence:    (id: string, evidenceId: string, notes?: string) =>
    api.post(`/unified-controls/${id}/evidence/${evidenceId}`, { notes }),
  unlinkEvidence:  (id: string, evidenceId: string) =>
    api.delete(`/unified-controls/${id}/evidence/${evidenceId}`),
  // Regulatory obligations
  listObligations:   (params?: any)          => api.get('/unified-controls/obligations', { params }),
  createObligation:  (data: any)             => api.post('/unified-controls/obligations', data),
  updateObligation:  (id: string, data: any) => api.put(`/unified-controls/obligations/${id}`, data),
};

// ── ESG / Sustainability ──────────────────────────────────────

export const esgApi = {
  dashboard:    (year?: number)            => api.get('/esg/dashboard', { params: year ? { year } : {} }),
  listReports:  ()                         => api.get('/esg/reports'),
  createReport: (data: any)               => api.post('/esg/reports', data),
  updateReport: (id: string, data: any)   => api.patch(`/esg/reports/${id}`, data),
  listMetrics:  (params?: { year?: number; pillar?: string; framework?: string }) =>
    api.get('/esg/metrics', { params }),
  upsertMetric: (data: any)               => api.post('/esg/metrics', data),
  updateMetric: (id: string, data: any)   => api.patch(`/esg/metrics/${id}`, data),
  seed:         (year?: number)           => api.post('/esg/seed', { year }),
};

// ── Business Continuity (ISO 22301) ──────────────────────────

export const bcpApi = {
  dashboard:   ()                          => api.get('/business-continuity/dashboard'),
  listPlans:   ()                          => api.get('/business-continuity/plans'),
  getPlan:     (id: string)                => api.get(`/business-continuity/plans/${id}`),
  createPlan:  (data: any)                => api.post('/business-continuity/plans', data),
  updatePlan:  (id: string, data: any)    => api.patch(`/business-continuity/plans/${id}`, data),
  addAsset:    (planId: string, data: any) => api.post(`/business-continuity/plans/${planId}/assets`, data),
  updateAsset: (planId: string, assetId: string, data: any) =>
    api.patch(`/business-continuity/plans/${planId}/assets/${assetId}`, data),
  removeAsset: (planId: string, assetId: string) =>
    api.delete(`/business-continuity/plans/${planId}/assets/${assetId}`),
  addTest:     (planId: string, data: any) => api.post(`/business-continuity/plans/${planId}/tests`, data),
  updateTest:  (planId: string, testId: string, data: any) =>
    api.patch(`/business-continuity/plans/${planId}/tests/${testId}`, data),
  removeTest:  (planId: string, testId: string) =>
    api.delete(`/business-continuity/plans/${planId}/tests/${testId}`),
};

// ── IT Service Management (ITSM / ITIL) ──────────────────────

export const itsmApi = {
  dashboard:       ()                              => api.get('/itsm/dashboard'),
  // Change Management
  listChanges:     (params?: { status?: string; changeType?: string }) =>
    api.get('/itsm/changes', { params }),
  createChange:    (data: any)                    => api.post('/itsm/changes', data),
  updateChange:    (id: string, data: any)        => api.patch(`/itsm/changes/${id}`, data),
  // Incident Management
  listIncidents:   (params?: { status?: string; priority?: string }) =>
    api.get('/itsm/incidents', { params }),
  createIncident:  (data: any)                    => api.post('/itsm/incidents', data),
  updateIncident:  (id: string, data: any)        => api.patch(`/itsm/incidents/${id}`, data),
  // Problem Management
  listProblems:    (params?: { status?: string }) => api.get('/itsm/problems', { params }),
  createProblem:   (data: any)                    => api.post('/itsm/problems', data),
  updateProblem:   (id: string, data: any)        => api.patch(`/itsm/problems/${id}`, data),
};

// ── AML / KYC / Financial Compliance ─────────────────────────

export const amlApi = {
  dashboard:       ()                              => api.get('/aml/dashboard'),
  listCases:       (params?: { status?: string; caseType?: string; riskLevel?: string }) =>
    api.get('/aml/cases', { params }),
  createCase:      (data: any)                    => api.post('/aml/cases', data),
  updateCase:      (id: string, data: any)        => api.patch(`/aml/cases/${id}`, data),
  listScreenings:  (params?: { screeningType?: string }) =>
    api.get('/aml/screenings', { params }),
  createScreening: (data: any)                    => api.post('/aml/screenings', data),
  listPolicies:    ()                             => api.get('/aml/policies'),
  createPolicy:    (data: any)                    => api.post('/aml/policies', data),
  updatePolicy:    (id: string, data: any)        => api.patch(`/aml/policies/${id}`, data),
};

// ── ISO 27701 — Privacy Information Management ───────────────

export const iso27701Api = {
  dashboard:      ()                              => api.get('/iso27701/dashboard'),
  updateControl:  (controlCode: string, data: any) =>
    api.patch(`/iso27701/controls/${encodeURIComponent(controlCode)}`, data),
  bulkUpdate:     (updates: any[])               => api.patch('/iso27701/controls', { updates }),
};

// ── SOC 2 Trust Service Criteria ─────────────────────────────

export const soc2Api = {
  dashboard:       ()                             => api.get('/soc2/dashboard'),
  updateCriterion: (criterionCode: string, data: any) =>
    api.patch(`/soc2/criteria/${encodeURIComponent(criterionCode)}`, data),
  bulkUpdate:      (updates: any[])              => api.patch('/soc2/criteria', { updates }),
};

// ── CIS Controls v8 ──────────────────────────────────────────

export const cisApi = {
  dashboard:     ()                          => api.get('/cis/dashboard'),
  updateControl: (id: string, data: any)     => api.patch(`/cis/${id}`, data),
  bulkUpdate:    (updates: any[])            => api.patch('/cis/bulk/update', { updates }),
};

// ── TISAX (VDA ISA) ──────────────────────────────────────────

export const tisaxApi = {
  dashboard:         ()                          => api.get('/tisax/dashboard'),
  createAssessment:  (data: any)                 => api.post('/tisax/assessments', data),
  updateAssessment:  (id: string, data: any)     => api.patch(`/tisax/assessments/${id}`, data),
  updateControl:     (id: string, data: any)     => api.patch(`/tisax/controls/${id}`, data),
  bulkUpdate:        (updates: any[])            => api.patch('/tisax/controls/bulk/update', { updates }),
};

// ── ISO 37001 / 37301 Anti-Bribery ───────────────────────────

export const antiBriberyApi = {
  dashboard:     ()                          => api.get('/anti-bribery/dashboard'),
  updateControl: (id: string, data: any)     => api.patch(`/anti-bribery/${id}`, data),
  bulkUpdate:    (updates: any[])            => api.patch('/anti-bribery/bulk/update', { updates }),
};

// ── ISO 45001 / Workforce Governance ─────────────────────────

export const workforceApi = {
  dashboard:     ()                          => api.get('/workforce/dashboard'),
  updateControl: (id: string, data: any)     => api.patch(`/workforce/${id}`, data),
  bulkUpdate:    (updates: any[])            => api.patch('/workforce/bulk/update', { updates }),
};

// ── ISO 9001 / CAPA ───────────────────────────────────────────

export const qualityApi = {
  dashboard:     ()                                              => api.get('/quality/dashboard'),
  listCapas:     (params?: { type?: string; status?: string })  => api.get('/quality/capa', { params }),
  createCapa:    (data: any)                                     => api.post('/quality/capa', data),
  updateCapa:    (id: string, data: any)                         => api.patch(`/quality/capa/${id}`, data),
  removeCapa:    (id: string)                                    => api.delete(`/quality/capa/${id}`),
  updateControl: (id: string, data: any)                         => api.patch(`/quality/controls/${id}`, data),
};

// ── Regulatory Change Governance ──────────────────────────────

export const regulatoryChangeApi = {
  dashboard:          ()                                                  => api.get('/regulatory-change/dashboard'),
  listChanges:        (params?: { status?: string; impact?: string })     => api.get('/regulatory-change/changes', { params }),
  createChange:       (data: any)                                          => api.post('/regulatory-change/changes', data),
  updateChange:       (id: string, data: any)                              => api.patch(`/regulatory-change/changes/${id}`, data),
  removeChange:       (id: string)                                         => api.delete(`/regulatory-change/changes/${id}`),
  listCalendar:       (params?: { from?: string; to?: string })            => api.get('/regulatory-change/calendar', { params }),
  createCalendarItem: (data: any)                                          => api.post('/regulatory-change/calendar', data),
  updateCalendarItem: (id: string, data: any)                              => api.patch(`/regulatory-change/calendar/${id}`, data),
  removeCalendarItem: (id: string)                                         => api.delete(`/regulatory-change/calendar/${id}`),
};

// ── Intake Forms ──────────────────────────────────────────────

export type IntakeFieldType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'file';

export interface IntakeField {
  id: string;
  type: IntakeFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export const intakeApi = {
  getSummary:        ()                                     => api.get('/intake/summary'),
  list:              ()                                     => api.get('/intake'),
  get:               (id: string)                           => api.get(`/intake/${id}`),
  create:            (data: { title: string; description?: string; fields: IntakeField[] }) => api.post('/intake', data),
  update:            (id: string, data: any)                => api.patch(`/intake/${id}`, data),
  remove:            (id: string)                           => api.delete(`/intake/${id}`),
  getSubmissions:    (id: string, page = 1, limit = 20)     => api.get(`/intake/${id}/submissions`, { params: { page, limit } }),
  getPublicForm:     (token: string)                        => api.get(`/public/intake/${token}`),
  submitPublic:      (token: string, data: { answers: Record<string, any>; submitterName?: string; submitterEmail?: string }) =>
                       api.post(`/public/intake/${token}/submit`, data),
};

// ── Action Plans ──────────────────────────────────────────────

export const actionPlansApi = {
  getSummary:  ()                              => api.get('/action-plans/summary'),
  list:        (status?: string)               => api.get('/action-plans', { params: status ? { status } : {} }),
  get:         (id: string)                    => api.get(`/action-plans/${id}`),
  create:      (data: any)                     => api.post('/action-plans', data),
  update:      (id: string, data: any)         => api.patch(`/action-plans/${id}`, data),
  remove:      (id: string)                    => api.delete(`/action-plans/${id}`),
  createTask:  (planId: string, data: any)     => api.post(`/action-plans/${planId}/tasks`, data),
  updateTask:  (planId: string, taskId: string, data: any) => api.patch(`/action-plans/${planId}/tasks/${taskId}`, data),
  removeTask:  (planId: string, taskId: string) => api.delete(`/action-plans/${planId}/tasks/${taskId}`),
};

// ── Program Templates ─────────────────────────────────────────

export const programTemplatesApi = {
  list:           ()                                         => api.get('/program-templates'),
  getActivations: ()                                         => api.get('/program-templates/activations'),
  activate:       (id: string, data: { startDate: string }) => api.post(`/program-templates/${id}/activate`, data),
};

// ── Automation ────────────────────────────────────────────────

export const automationApi = {
  getSummary: ()                         => api.get('/automation/summary'),
  list:       ()                         => api.get('/automation'),
  create:     (data: any)                => api.post('/automation', data),
  update:     (id: string, data: any)    => api.patch(`/automation/${id}`, data),
  remove:     (id: string)               => api.delete(`/automation/${id}`),
  getLogs:    (id: string)               => api.get(`/automation/${id}/logs`),
  trigger:    (id: string)               => api.post(`/automation/${id}/trigger`),
};

