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
  resendInvite: (id: string) => api.post(`/users/${id}/resend-invite`),
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
};

export const risksApi = {
  list: (params?: any) => api.get('/risks', { params }),
  get: (id: string) => api.get(`/risks/${id}`),
  heatmap: () => api.get('/risks/heatmap'),
  create: (data: any) => api.post('/risks', data),
  update: (id: string, data: any) => api.patch(`/risks/${id}`, data),
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
  updateStatus: (id: string, status: string) =>
    api.patch(`/evidence/${id}/status`, { status }),
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
  list: () => api.get('/reports'),
  summary: (projectId?: string) =>
    api.get('/reports/summary', { params: { projectId } }),
  generate: (data: any) => api.post('/reports/generate', data),
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
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
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
  chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    api.post('/ai-assistant/chat', { messages }),
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

// ── Licensing (backoffice) ────────────────────────────────────

export const licensingApi = {
  catalogue:     ()              => api.get('/licensing/catalogue'),
  myLicense:     ()              => api.get('/licensing/my'),
  stats:         ()              => api.get('/licensing/stats'),
  listClients:   ()              => api.get('/licensing/clients'),
  getClient:     (orgId: string) => api.get(`/licensing/clients/${orgId}`),
  upsert:        (orgId: string, data: any) => api.put(`/licensing/clients/${orgId}`, data),
  createInvoice: (orgId: string, data: any) => api.post(`/licensing/clients/${orgId}/invoices`, data),
  markPaid:      (invoiceId: string)        => api.put(`/licensing/invoices/${invoiceId}/paid`, {}),
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
