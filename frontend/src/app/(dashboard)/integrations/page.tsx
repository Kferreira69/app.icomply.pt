'use client';

import { useState, useEffect, useMemo } from 'react';
import { integrationHubApi } from '@/lib/api';
import {
  Plug2, Search, CheckCircle2, Circle, Settings2,
  Loader2, X, ExternalLink, Key, ChevronDown, ChevronUp,
  Shield, Users, Smartphone, Briefcase, Cloud, Code2,
  MessageSquare, Scale, BookOpen, Activity, Mail, Server,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Integration catalog ──────────────────────────────────────────────────────

type IntegrationEntry = {
  key: string;
  name: string;
  category: string;
  type: 'native' | 'truto';
  description: string;
  popular?: boolean;
};

const CATALOG: IntegrationEntry[] = [
  // IAM
  { key: 'okta', name: 'Okta', category: 'iam', type: 'truto', description: 'Identity & Access Management — utilizadores, grupos, MFA, SSO', popular: true },
  { key: 'entra-id', name: 'Microsoft Entra ID', category: 'iam', type: 'native', description: 'Azure AD — auditoria de acessos, utilizadores, sign-in logs', popular: true },
  { key: 'google-workspace', name: 'Google Workspace', category: 'iam', type: 'truto', description: 'Contas, grupos, auditoria de actividade, políticas de segurança', popular: true },
  { key: 'jumpcloud', name: 'JumpCloud', category: 'iam', type: 'truto', description: 'Directório de utilizadores, dispositivos, políticas' },
  { key: 'onelogin', name: 'OneLogin', category: 'iam', type: 'truto', description: 'SSO events, utilizadores, grupos' },
  { key: 'duo', name: 'Duo Security', category: 'iam', type: 'truto', description: 'MFA events, dispositivos confiáveis, bypass codes' },
  { key: 'auth0', name: 'Auth0', category: 'iam', type: 'truto', description: 'Logs de autenticação, utilizadores, aplicações' },
  { key: 'aws-iam', name: 'AWS IAM', category: 'iam', type: 'truto', description: 'Policies, roles, utilizadores, access keys' },
  { key: 'keycloak', name: 'Keycloak', category: 'iam', type: 'truto', description: 'Realm events, utilizadores, sessões' },
  { key: 'cyberark', name: 'CyberArk', category: 'iam', type: 'truto', description: 'Privileged sessions, vault accounts' },
  { key: 'sailpoint', name: 'SailPoint', category: 'iam', type: 'truto', description: 'Identity governance, access certifications' },
  { key: 'beyondtrust', name: 'BeyondTrust', category: 'iam', type: 'truto', description: 'Privileged access sessions, password safe' },
  { key: 'hashicorp-vault', name: 'HashiCorp Vault', category: 'iam', type: 'truto', description: 'Audit logs, secrets access, policies' },
  { key: 'cloudflare-access', name: 'Cloudflare Access', category: 'iam', type: 'truto', description: 'Access logs, políticas Zero Trust' },
  { key: 'zscaler', name: 'Zscaler', category: 'iam', type: 'truto', description: 'ZTNA access logs, políticas de acesso' },
  { key: '1password', name: '1Password Teams', category: 'iam', type: 'truto', description: 'Audit events, vault access, team memberships' },
  { key: 'ping-identity', name: 'Ping Identity', category: 'iam', type: 'truto', description: 'SSO events, identity policies' },
  { key: 'forgerock', name: 'ForgeRock', category: 'iam', type: 'truto', description: 'Identity events, access logs' },
  // MDM
  { key: 'jamf', name: 'Jamf Pro', category: 'mdm', type: 'truto', description: 'Dispositivos Apple, compliance status, patches, encriptação', popular: true },
  { key: 'intune', name: 'Microsoft Intune', category: 'mdm', type: 'truto', description: 'Dispositivos Windows/iOS/Android, compliance policies', popular: true },
  { key: 'kandji', name: 'Kandji', category: 'mdm', type: 'truto', description: 'Dispositivos Apple, blueprints, compliance checks' },
  { key: 'workspace-one', name: 'VMware Workspace ONE', category: 'mdm', type: 'truto', description: 'Dispositivos multi-OS, compliance policies, apps' },
  { key: 'mosyle', name: 'Mosyle', category: 'mdm', type: 'truto', description: 'Dispositivos Apple, segurança, compliance' },
  { key: 'addigy', name: 'Addigy', category: 'mdm', type: 'truto', description: 'Dispositivos macOS, patches, compliance' },
  { key: 'simplemdm', name: 'SimpleMDM', category: 'mdm', type: 'truto', description: 'Dispositivos Apple, perfis, apps' },
  { key: 'hexnode', name: 'Hexnode', category: 'mdm', type: 'truto', description: 'Dispositivos multi-OS, políticas, compliance' },
  { key: 'soti', name: 'SOTI MobiControl', category: 'mdm', type: 'truto', description: 'Dispositivos enterprise, compliance, segurança' },
  { key: 'meraki-mdm', name: 'Cisco Meraki MDM', category: 'mdm', type: 'truto', description: 'Dispositivos, perfis, compliance' },
  { key: 'esper', name: 'Esper', category: 'mdm', type: 'truto', description: 'Dispositivos Android, compliance, kiosk mode' },
  { key: 'miradore', name: 'Miradore', category: 'mdm', type: 'truto', description: 'Dispositivos multi-OS, compliance, inventário' },
  // HRIS
  { key: 'rippling', name: 'Rippling', category: 'hris', type: 'truto', description: 'Colaboradores, departamentos, onboarding/offboarding, apps', popular: true },
  { key: 'bamboohr', name: 'BambooHR', category: 'hris', type: 'truto', description: 'Perfis de colaboradores, offboarding, políticas de RH', popular: true },
  { key: 'workday', name: 'Workday', category: 'hris', type: 'truto', description: 'Colaboradores, estrutura organizacional, contratos' },
  { key: 'adp', name: 'ADP Workforce Now', category: 'hris', type: 'truto', description: 'Colaboradores, payroll compliance, departamentos' },
  { key: 'sap-sf', name: 'SAP SuccessFactors', category: 'hris', type: 'truto', description: 'HCM, formação, performance' },
  { key: 'gusto', name: 'Gusto', category: 'hris', type: 'truto', description: 'Colaboradores, payroll, benefits compliance' },
  { key: 'hibob', name: 'HiBob', category: 'hris', type: 'truto', description: 'People data, onboarding, offboarding' },
  { key: 'personio', name: 'Personio', category: 'hris', type: 'truto', description: 'Colaboradores, ausências, contratos' },
  { key: 'paycor', name: 'Paycor', category: 'hris', type: 'truto', description: 'Colaboradores, payroll, compliance' },
  { key: 'deel', name: 'Deel', category: 'hris', type: 'truto', description: 'Contratos globais, colaboradores internacionais' },
  { key: 'remote', name: 'Remote', category: 'hris', type: 'truto', description: 'EOR data, colaboradores globais' },
  { key: 'greenhouse', name: 'Greenhouse', category: 'hris', type: 'truto', description: 'Recrutamento, onboarding pipeline' },
  { key: 'lattice', name: 'Lattice', category: 'hris', type: 'truto', description: 'Performance reviews, OKRs, compliance de formação' },
  // Ticketing
  { key: 'jira', name: 'Jira', category: 'ticketing', type: 'truto', description: 'Issues, projectos, status de tarefas de compliance', popular: true },
  { key: 'linear', name: 'Linear', category: 'ticketing', type: 'truto', description: 'Issues, cycles, milestones de compliance' },
  { key: 'asana', name: 'Asana', category: 'ticketing', type: 'truto', description: 'Tarefas, projectos, responsáveis' },
  { key: 'monday', name: 'Monday.com', category: 'ticketing', type: 'truto', description: 'Boards, tarefas, prazos' },
  { key: 'servicenow', name: 'ServiceNow', category: 'ticketing', type: 'truto', description: 'ITSM tickets, change management, incidents' },
  { key: 'zendesk', name: 'Zendesk', category: 'ticketing', type: 'truto', description: 'Tickets de suporte, SLA compliance' },
  { key: 'clickup', name: 'ClickUp', category: 'ticketing', type: 'truto', description: 'Tarefas, projectos, automações' },
  { key: 'trello', name: 'Trello', category: 'ticketing', type: 'truto', description: 'Boards, cards, listas' },
  { key: 'notion', name: 'Notion', category: 'ticketing', type: 'truto', description: 'Docs, databases, pages de compliance' },
  { key: 'freshservice', name: 'Freshservice', category: 'ticketing', type: 'truto', description: 'ITSM, change management' },
  { key: 'azure-devops', name: 'Azure DevOps', category: 'ticketing', type: 'truto', description: 'Work items, boards, pipelines' },
  { key: 'shortcut', name: 'Shortcut', category: 'ticketing', type: 'truto', description: 'Stories, epics, iterations' },
  { key: 'github-issues', name: 'GitHub Issues', category: 'ticketing', type: 'native', description: 'Issues, labels, milestones' },
  // Cloud Security
  { key: 'aws-cloudtrail', name: 'AWS CloudTrail', category: 'cloud', type: 'native', description: 'Logs de auditoria de toda a actividade AWS', popular: true },
  { key: 'gcp-audit', name: 'GCP Audit Logs', category: 'cloud', type: 'native', description: 'Logs de actividade Google Cloud' },
  { key: 'sentinel', name: 'Microsoft Sentinel', category: 'cloud', type: 'truto', description: 'SIEM incidents, security alerts' },
  { key: 'aws-security-hub', name: 'AWS Security Hub', category: 'cloud', type: 'truto', description: 'Security findings, compliance checks (CIS, PCI)' },
  { key: 'aws-guardduty', name: 'AWS GuardDuty', category: 'cloud', type: 'truto', description: 'Threat detections, findings' },
  { key: 'wiz', name: 'Wiz', category: 'cloud', type: 'truto', description: 'Cloud vulnerabilities, misconfigurations, CSPM findings' },
  { key: 'snyk', name: 'Snyk', category: 'cloud', type: 'truto', description: 'Vulnerabilidades em código e dependências' },
  { key: 'lacework', name: 'Lacework', category: 'cloud', type: 'truto', description: 'Cloud security anomalies, compliance' },
  { key: 'crowdstrike', name: 'CrowdStrike Falcon', category: 'cloud', type: 'truto', description: 'Endpoint detections, vulnerabilities, incidents', popular: true },
  { key: 'prisma-cloud', name: 'Prisma Cloud', category: 'cloud', type: 'truto', description: 'CNAPP findings, compliance checks' },
  { key: 'orca', name: 'Orca Security', category: 'cloud', type: 'truto', description: 'CSPM agentless findings' },
  { key: 'tenable', name: 'Tenable.io', category: 'cloud', type: 'truto', description: 'Vulnerability findings, scan results' },
  { key: 'qualys', name: 'Qualys VMDR', category: 'cloud', type: 'truto', description: 'Vulnerability management results' },
  { key: 'rapid7', name: 'Rapid7 InsightVM', category: 'cloud', type: 'truto', description: 'Vulnerability data, remediation tracking' },
  { key: 'datadog', name: 'Datadog', category: 'cloud', type: 'truto', description: 'Security signals, compliance monitors' },
  // DevSecOps
  { key: 'github', name: 'GitHub', category: 'devsecops', type: 'native', description: 'Audit log, repositórios, secret scanning, dependências vulneráveis', popular: true },
  { key: 'gitlab', name: 'GitLab', category: 'devsecops', type: 'truto', description: 'CI/CD logs, vulnerabilities, compliance checks' },
  { key: 'bitbucket', name: 'Bitbucket', category: 'devsecops', type: 'truto', description: 'Repositórios, pipelines, audit log' },
  { key: 'sonarqube', name: 'SonarQube', category: 'devsecops', type: 'truto', description: 'Code quality, security hotspots, vulnerabilities' },
  { key: 'checkmarx', name: 'Checkmarx', category: 'devsecops', type: 'truto', description: 'SAST findings, vulnerabilidades em código' },
  { key: 'veracode', name: 'Veracode', category: 'devsecops', type: 'truto', description: 'Application security results' },
  { key: 'semgrep', name: 'Semgrep', category: 'devsecops', type: 'truto', description: 'SAST findings, custom rules violations' },
  { key: 'terraform', name: 'Terraform Cloud', category: 'devsecops', type: 'truto', description: 'IaC compliance, run history, policy violations' },
  { key: 'kubernetes', name: 'Kubernetes', category: 'devsecops', type: 'truto', description: 'Cluster config, RBAC, security policies' },
  { key: 'docker', name: 'Docker Hub', category: 'devsecops', type: 'truto', description: 'Image vulnerabilities, scan results' },
  { key: 'circleci', name: 'CircleCI', category: 'devsecops', type: 'truto', description: 'Pipeline logs, compliance checks' },
  { key: 'argocd', name: 'ArgoCD', category: 'devsecops', type: 'truto', description: 'Deployment audit log, sync history' },
  // Communications
  { key: 'slack', name: 'Slack', category: 'comms', type: 'truto', description: 'Notificações de compliance, alertas, channel audit logs', popular: true },
  { key: 'teams', name: 'Microsoft Teams', category: 'comms', type: 'truto', description: 'Notificações de alertas, compliance channels' },
  { key: 'google-chat', name: 'Google Chat', category: 'comms', type: 'truto', description: 'Notificações via Spaces' },
  { key: 'zoom', name: 'Zoom', category: 'comms', type: 'truto', description: 'Gravações, acesso a reuniões, audit log' },
  { key: 'webex', name: 'Cisco Webex', category: 'comms', type: 'truto', description: 'Audit log, compliance recording' },
  { key: 'pagerduty', name: 'PagerDuty', category: 'comms', type: 'truto', description: 'Alertas críticos de compliance, incident management' },
  // GRC
  { key: 'vanta', name: 'Vanta', category: 'grc', type: 'truto', description: 'Compliance checks, evidence collection' },
  { key: 'drata', name: 'Drata', category: 'grc', type: 'truto', description: 'Continuous compliance, evidence sync' },
  { key: 'secureframe', name: 'Secureframe', category: 'grc', type: 'truto', description: 'Compliance automation data' },
  { key: 'sprinto', name: 'Sprinto', category: 'grc', type: 'truto', description: 'GRC data, compliance checks' },
  { key: 'onetrust', name: 'OneTrust', category: 'grc', type: 'truto', description: 'Privacy compliance, consent management' },
  { key: 'logicgate', name: 'LogicGate', category: 'grc', type: 'truto', description: 'Risk and compliance workflows' },
  { key: 'hyperproof', name: 'Hyperproof', category: 'grc', type: 'truto', description: 'Compliance operations data' },
  { key: 'metacompliance', name: 'MetaCompliance', category: 'grc', type: 'truto', description: 'Policy management, awareness data' },
  // Training
  { key: 'knowbe4', name: 'KnowBe4', category: 'training', type: 'truto', description: 'Training completion, phishing simulation results', popular: true },
  { key: 'proofpoint-aware', name: 'Proofpoint Security Awareness', category: 'training', type: 'truto', description: 'Training data, simulation results' },
  { key: 'sans', name: 'SANS Awareness', category: 'training', type: 'truto', description: 'Training completions, certifications' },
  { key: 'mimecast-train', name: 'Mimecast Training', category: 'training', type: 'truto', description: 'Awareness training data' },
  { key: 'curricula', name: 'Curricula', category: 'training', type: 'truto', description: 'Training completions, quiz results' },
  { key: 'ninjio', name: 'Ninjio', category: 'training', type: 'truto', description: 'Micro-training completion data' },
  { key: 'docebo', name: 'Docebo LMS', category: 'training', type: 'truto', description: 'Formação, certificações, compliance training' },
  // SIEM
  { key: 'splunk', name: 'Splunk', category: 'siem', type: 'truto', description: 'Security events, compliance logs, SIEM alerts' },
  { key: 'qradar', name: 'IBM QRadar', category: 'siem', type: 'truto', description: 'Security offenses, compliance reports' },
  { key: 'elastic-siem', name: 'Elastic SIEM', category: 'siem', type: 'truto', description: 'Security signals, alerts' },
  { key: 'sumo-logic', name: 'Sumo Logic', category: 'siem', type: 'truto', description: 'Cloud logs, security insights' },
  { key: 'logrhythm', name: 'LogRhythm', category: 'siem', type: 'truto', description: 'SIEM events, compliance reports' },
  { key: 'exabeam', name: 'Exabeam', category: 'siem', type: 'truto', description: 'UEBA insights, SIEM data' },
  { key: 'new-relic', name: 'New Relic', category: 'siem', type: 'truto', description: 'Security alerts, SLA compliance data' },
  // Email Security
  { key: 'proofpoint', name: 'Proofpoint', category: 'email', type: 'truto', description: 'Email threat data, DLP violations, compliance logs', popular: true },
  { key: 'mimecast', name: 'Mimecast', category: 'email', type: 'truto', description: 'Email security events, archiving compliance' },
  { key: 'abnormal', name: 'Abnormal Security', category: 'email', type: 'truto', description: 'BEC/phishing detections' },
  { key: 'barracuda', name: 'Barracuda', category: 'email', type: 'truto', description: 'Email security events' },
  { key: 'cofense', name: 'Cofense', category: 'email', type: 'truto', description: 'Phishing simulation results, incident reports' },
  // Other
  { key: 'palo-alto', name: 'Palo Alto Networks', category: 'other', type: 'truto', description: 'Firewall logs, threat prevention' },
  { key: 'fortinet', name: 'Fortinet', category: 'other', type: 'truto', description: 'Network security events, compliance reports' },
  { key: 'cisco-security', name: 'Cisco Security', category: 'other', type: 'truto', description: 'XDR events, Duo MFA, Umbrella logs' },
  { key: 'veeam', name: 'Veeam', category: 'other', type: 'truto', description: 'Backup compliance, recovery point objectives' },
  { key: 'rubrik', name: 'Rubrik', category: 'other', type: 'truto', description: 'Data protection status, backup compliance' },
  { key: 'box', name: 'Box', category: 'other', type: 'truto', description: 'File access logs, DLP, compliance reports' },
  { key: 'dropbox', name: 'Dropbox Business', category: 'other', type: 'truto', description: 'File access audit, sharing compliance' },
  { key: 'hackerone', name: 'HackerOne', category: 'other', type: 'truto', description: 'Bug bounty findings, vulnerability reports' },
  { key: 'salt-security', name: 'Salt Security', category: 'other', type: 'truto', description: 'API security violations, abuse patterns' },
  { key: 'sysdig', name: 'Sysdig', category: 'other', type: 'truto', description: 'Container runtime security, compliance' },
  { key: 'falco', name: 'Falco', category: 'other', type: 'truto', description: 'Runtime security alerts, policy violations' },
  { key: 'nessus', name: 'Nessus', category: 'other', type: 'truto', description: 'Vulnerability scan results' },
];

const CATEGORIES = [
  { key: 'all',        label: 'Todas',              icon: Plug2 },
  { key: 'popular',   label: 'Populares',           icon: Star },
  { key: 'iam',       label: 'Identidade & Acesso', icon: Shield },
  { key: 'mdm',       label: 'MDM',                 icon: Smartphone },
  { key: 'hris',      label: 'Recursos Humanos',    icon: Users },
  { key: 'ticketing', label: 'Ticketing',           icon: Briefcase },
  { key: 'cloud',     label: 'Cloud Security',      icon: Cloud },
  { key: 'devsecops', label: 'DevSecOps',           icon: Code2 },
  { key: 'comms',     label: 'Comunicações',        icon: MessageSquare },
  { key: 'grc',       label: 'GRC',                 icon: Scale },
  { key: 'training',  label: 'Formação',            icon: BookOpen },
  { key: 'siem',      label: 'SIEM',                icon: Activity },
  { key: 'email',     label: 'Email Security',      icon: Mail },
  { key: 'other',     label: 'Outros',              icon: Server },
];

// ─── Truto key modal ─────────────────────────────────────────────────────────

function TrutoKeyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await integrationHubApi.saveTrutoKey(apiKey.trim());
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" /> Configurar Truto API Key
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Introduz a tua chave API Truto para activar 200+ integrações. Podes obter a chave em{' '}
          <span className="text-blue-600">truto.one</span>.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-truto-..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !apiKey.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Guardar chave
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────

function IntegrationCard({
  item,
  connected,
  onConnect,
  onDisconnect,
  loading,
}: {
  item: IntegrationEntry;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md',
      connected ? 'border-green-200 bg-green-50/30' : 'border-gray-100',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0',
            item.type === 'native' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
          )}>
            {item.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
            <span className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              item.type === 'native' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
            )}>
              {item.type === 'native' ? 'Nativa' : 'Truto'}
            </span>
          </div>
        </div>
        {connected && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
      <div className="flex gap-2 mt-auto">
        {connected ? (
          <button
            onClick={onDisconnect}
            disabled={loading}
            className="flex-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Desligar
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug2 className="w-3 h-3" />}
            Ligar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showTrutoModal, setShowTrutoModal] = useState(false);
  const [trutoConfigured, setTrutoConfigured] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      integrationHubApi.list(),
      integrationHubApi.getTrutoKey(),
    ]).then(([listRes, keyRes]) => {
      const map: Record<string, boolean> = {};
      (listRes.data as any[]).forEach((i: any) => { map[i.key] = i.isConnected; });
      setConnectedMap(map);
      setTrutoConfigured(!!(keyRes.data as any).configured);
    }).catch(() => {}).finally(() => setPageLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = CATALOG;
    if (activeCategory === 'popular') items = items.filter(i => i.popular);
    else if (activeCategory !== 'all') items = items.filter(i => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, search]);

  const connect = async (item: IntegrationEntry) => {
    setLoadingKeys(prev => new Set(prev).add(item.key));
    try {
      await integrationHubApi.upsert({ key: item.key, displayName: item.name, category: item.category, isConnected: false });
      await integrationHubApi.connect(item.key);
      setConnectedMap(prev => ({ ...prev, [item.key]: true }));
    } finally {
      setLoadingKeys(prev => { const s = new Set(prev); s.delete(item.key); return s; });
    }
  };

  const disconnect = async (item: IntegrationEntry) => {
    setLoadingKeys(prev => new Set(prev).add(item.key));
    try {
      await integrationHubApi.disconnect(item.key);
      setConnectedMap(prev => ({ ...prev, [item.key]: false }));
    } finally {
      setLoadingKeys(prev => { const s = new Set(prev); s.delete(item.key); return s; });
    }
  };

  const connectedCount = Object.values(connectedMap).filter(Boolean).length;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Plug2 className="w-6 h-6 text-blue-600" />
            Integration Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {CATALOG.length}+ integrações disponíveis · {connectedCount} ligadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-full',
            trutoConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
          )}>
            {trutoConfigured ? '✓ Truto configurado' : '⚠ Truto não configurado'}
          </span>
          <button
            onClick={() => setShowTrutoModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
          >
            <Settings2 className="w-4 h-4" />
            Configurar Truto
          </button>
        </div>
      </div>

      {/* Truto banner */}
      {!trutoConfigured && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Activa 200+ integrações com uma única chave API</p>
            <p className="text-sm text-blue-700 mt-0.5">
              O iComply usa o Truto para conectar com toda a tua stack tecnológica. Configura a chave API uma vez e liga as integrações que precisares quando precisares.
            </p>
          </div>
          <button
            onClick={() => setShowTrutoModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 whitespace-nowrap"
          >
            Configurar agora
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar integrações..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = cat.key === 'all' ? CATALOG.length
            : cat.key === 'popular' ? CATALOG.filter(i => i.popular).length
            : CATALOG.filter(i => i.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors',
                activeCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
              <span className={cn(
                'text-[10px] px-1 rounded-full',
                activeCategory === cat.key ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Plug2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma integração encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <IntegrationCard
              key={item.key}
              item={item}
              connected={!!connectedMap[item.key]}
              onConnect={() => connect(item)}
              onDisconnect={() => disconnect(item)}
              loading={loadingKeys.has(item.key)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showTrutoModal && (
        <TrutoKeyModal
          onClose={() => setShowTrutoModal(false)}
          onSaved={() => setTrutoConfigured(true)}
        />
      )}
    </div>
  );
}
