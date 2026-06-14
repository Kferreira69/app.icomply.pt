'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iGuardApi } from '@/lib/api';
import { Loader2, Shield, Monitor, AlertTriangle, CheckCircle2, XCircle, Clock, Download, Server, Network, Plus, Trash2, Wifi } from 'lucide-react';
import { IGuardLogo } from '@/components/iguard/IGuardLogo';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────

interface DeviceAgent {
  id: string;
  deviceName: string;
  hostname?: string;
  os: 'macos' | 'windows' | 'linux';
  osVersion?: string;
  arch?: string;
  agentVersion?: string;
  deviceType?: 'ENDPOINT' | 'SERVER' | 'NETWORK_DEVICE';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  // Endpoint checks
  diskEncryption?: boolean;
  screenLock?: boolean;
  antivirusEnabled?: boolean;
  osUpToDate?: boolean;
  passwordManager?: boolean;
  // Server checks
  sshRootLoginDisabled?: boolean;
  firewallActive?: boolean;
  pendingPatches?: number;
  openPorts?: string[];
  complianceScore?: number;
  lastSeenAt?: string;
  registeredAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface OrgStats {
  total: number;
  active: number;
  compliant: number;
  nonCompliant: number;
  avgScore: number;
  checkStats: {
    diskEncryption: number;
    screenLock: number;
    antivirusEnabled: number;
    osUpToDate: number;
  };
}

interface NetworkProbe {
  id: string;
  name: string;
  subnetCIDR: string;
  probeToken: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  lastScannedAt?: string;
  createdAt: string;
  _count?: { discoveredDevices: number };
}

interface DiscoveredDevice {
  id: string;
  ipAddress: string;
  hostname?: string;
  macAddress?: string;
  vendor?: string;
  deviceCategory?: string;
  os?: string;
  firmwareVersion?: string;
  openPorts?: number[];
  isManaged: boolean;
  riskScore?: number;
  issues?: string[];
  lastSeenAt: string;
}

// ── Helpers ───────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function scoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return '#9ca3af';
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreBg(score: number | undefined): string {
  if (score === undefined || score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function statusBadge(status: DeviceAgent['status']) {
  const map: Record<DeviceAgent['status'], string> = {
    ACTIVE:   'bg-green-100 text-green-700',
    PENDING:  'bg-amber-100 text-amber-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    REVOKED:  'bg-red-100 text-red-700',
  };
  const label: Record<DeviceAgent['status'], string> = {
    ACTIVE: 'Ativo', PENDING: 'Pendente', INACTIVE: 'Inativo', REVOKED: 'Revogado',
  };
  return { cls: map[status], label: label[status] };
}

function relativeTime(dateStr?: string): { text: string; warn: boolean } {
  if (!dateStr) return { text: 'Nunca', warn: true };
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return { text: `há ${mins}m`, warn: false };
  if (hours < 24) return { text: `há ${hours}h`, warn: false };
  return { text: `há ${days} dia${days !== 1 ? 's' : ''}`, warn: days > 7 };
}

function OsIcon({ os, deviceType }: { os: string; deviceType?: string }) {
  if (deviceType === 'SERVER' && os === 'linux') return <span title="Linux Server" className="text-xl">🐧</span>;
  if (deviceType === 'SERVER' && os === 'windows') return <span title="Windows Server" className="text-xl">🖥️</span>;
  if (os === 'macos') return <span title="macOS" className="text-xl">🍎</span>;
  if (os === 'windows') return <span title="Windows" className="text-xl">🪟</span>;
  return <span title="Linux" className="text-xl">🐧</span>;
}

// ── Score Ring ─────────────────────────────────────────────────

function ScoreRing({ score }: { score?: number }) {
  const value = score ?? 0;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}
      >
        {score !== undefined ? score : '—'}
      </span>
    </div>
  );
}

// ── Check Badge ───────────────────────────────────────────────

function CheckBadge({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium',
      value === true  ? 'bg-green-50 text-green-700 border-green-200' :
      value === false ? 'bg-red-50   text-red-700   border-red-200'   :
                        'bg-gray-50  text-gray-500  border-gray-200',
    )}>
      {value === true  ? <CheckCircle2 className="w-3 h-3" /> :
       value === false ? <XCircle      className="w-3 h-3" /> :
                        <Clock        className="w-3 h-3" />}
      {label}
    </div>
  );
}

// ── Device Card ───────────────────────────────────────────────

function DeviceCard({ device, onRevoke }: { device: DeviceAgent; onRevoke: (id: string) => void }) {
  const { cls: sBadgeCls, label: sLabel } = statusBadge(device.status);
  const { text: lastSeen, warn: lastSeenWarn } = relativeTime(device.lastSeenAt);
  const userName = device.user ? `${device.user.firstName} ${device.user.lastName}` : '—';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <OsIcon os={device.os} deviceType={device.deviceType} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{device.deviceName}</p>
          {device.hostname && (
            <p className="text-xs text-gray-400 truncate">{device.hostname}</p>
          )}
        </div>
        <ScoreRing score={device.complianceScore} />
      </div>

      {/* User */}
      <div className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">{userName}</span>
        {device.user?.email && (
          <span className="ml-1 text-gray-400">· {device.user.email}</span>
        )}
      </div>

      {/* Check badges */}
      <div className="flex flex-wrap gap-1">
        {device.deviceType === 'SERVER' ? (
          <>
            <CheckBadge label="SSH Root"    value={device.sshRootLoginDisabled} />
            <CheckBadge label="Firewall"    value={device.firewallActive} />
            <CheckBadge label="OS Atual"    value={device.osUpToDate} />
            <CheckBadge label={`Patches: ${device.pendingPatches ?? '?'}`} value={(device.pendingPatches ?? 0) === 0} />
          </>
        ) : (
          <>
            <CheckBadge label="Encriptação" value={device.diskEncryption} />
            <CheckBadge label="Screen Lock"  value={device.screenLock} />
            <CheckBadge label="Antivírus"    value={device.antivirusEnabled} />
            <CheckBadge label="OS Atual"     value={device.osUpToDate} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sBadgeCls)}>
            {sLabel}
          </span>
          {device.agentVersion && (
            <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              v{device.agentVersion}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs', lastSeenWarn ? 'text-red-500 font-medium' : 'text-gray-400')}>
            {lastSeen}
          </span>
          {device.status !== 'REVOKED' && (
            <button
              onClick={() => onRevoke(device.id)}
              className="text-xs text-red-500 hover:text-red-700 hover:underline"
            >
              Revogar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 80 ? 'bg-green-500' :
    pct >= 50 ? 'bg-amber-400' :
                'bg-red-500';
  const textColor =
    pct >= 80 ? 'text-green-700' :
    pct >= 50 ? 'text-amber-700' :
                'text-red-600';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={cn('font-semibold', textColor)}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Tab: Dispositivos ─────────────────────────────────────────

function DevicesTab({ devices, isLoading, onRevoke }: {
  devices: DeviceAgent[];
  isLoading: boolean;
  onRevoke: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const STATUS_OPTIONS = ['Todos', 'Ativo', 'Inativo', 'Pendente', 'Revogado'];
  const STATUS_MAP: Record<string, DeviceAgent['status']> = {
    Ativo: 'ACTIVE', Inativo: 'INACTIVE', Pendente: 'PENDING', Revogado: 'REVOKED',
  };

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.deviceName.toLowerCase().includes(q) ||
      (d.hostname ?? '').toLowerCase().includes(q) ||
      (d.user ? `${d.user.firstName} ${d.user.lastName}`.toLowerCase().includes(q) : false);
    const matchStatus =
      statusFilter === 'Todos' || d.status === STATUS_MAP[statusFilter];
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Pesquisar por dispositivo, utilizador ou hostname…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pl-9 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <Monitor className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          <Monitor className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">Nenhum dispositivo registado</p>
          <p className="text-xs mt-1">Partilhe o link de instalação com a sua equipa</p>
          <Link href="/iguard/install" className="mt-3 text-xs text-primary underline">
            Instalar iGuard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => (
            <DeviceCard key={d.id} device={d} onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Estatísticas ─────────────────────────────────────────

function StatsTab({ stats, devices }: { stats: OrgStats; devices: DeviceAgent[] }) {
  const checks: { key: keyof OrgStats['checkStats']; label: string }[] = [
    { key: 'diskEncryption',   label: '🔒 Encriptação de Disco' },
    { key: 'screenLock',       label: '🔐 Bloqueio de Ecrã' },
    { key: 'antivirusEnabled', label: '🛡️ Antivírus Ativo' },
    { key: 'osUpToDate',       label: '🔄 Sistema Operativo Atual' },
  ];

  const critical = devices.filter(d => (d.complianceScore ?? 0) < 50);
  const medium   = devices.filter(d => { const s = d.complianceScore ?? 0; return s >= 50 && s < 80; });
  const compliantDevices = devices.filter(d => (d.complianceScore ?? 0) >= 80);

  // Top 5 non-compliant
  const needsAttention = [...devices]
    .filter(d => d.status !== 'REVOKED')
    .sort((a, b) => (a.complianceScore ?? 0) - (b.complianceScore ?? 0))
    .slice(0, 5);

  const kpis = [
    { label: 'Total Dispositivos', value: stats.total, color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
    { label: 'Dispositivos Ativos', value: stats.active, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Conformes', value: stats.compliant, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    { label: 'Não Conformes', value: stats.nonCompliant, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  ];

  const totalForPct = stats.active || 1;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={cn('rounded-xl border p-5 flex flex-col gap-1', k.bg)}>
            <p className={cn('text-3xl font-bold', k.color)}>{k.value}</p>
            <p className="text-xs text-gray-500 font-medium">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check compliance bars */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Verificações de Conformidade</h3>
          {checks.map(c => {
            const pct = Math.round(((stats.checkStats?.[c.key] ?? 0) / totalForPct) * 100);
            return <ProgressBar key={c.key} label={c.label} pct={pct} />;
          })}
          <p className="text-xs text-gray-400 pt-1">
            Score médio: <span className="font-semibold text-gray-600">{Math.round(stats.avgScore ?? 0)}/100</span>
          </p>
        </div>

        {/* Score distribution */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Distribuição por Score</h3>
            <div className="space-y-2">
              {[
                { label: 'Crítico (0–49)',  count: critical.length,         color: 'bg-red-500' },
                { label: 'Médio (50–79)',   count: medium.length,           color: 'bg-amber-400' },
                { label: 'Conforme (80–100)', count: compliantDevices.length, color: 'bg-green-500' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', row.color)} />
                    <span className="text-gray-600">{row.label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{row.count} dispositivo{row.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Devices needing attention */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Requerem Atenção
            </h3>
            {needsAttention.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Todos os dispositivos estão conformes 🎉</p>
            ) : (
              <div className="space-y-2">
                {needsAttention.map(d => {
                  const failing = [
                    !d.diskEncryption    && 'Encriptação',
                    !d.screenLock        && 'Screen Lock',
                    !d.antivirusEnabled  && 'Antivírus',
                    !d.osUpToDate        && 'OS Atual',
                  ].filter(Boolean) as string[];
                  return (
                    <div key={d.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <ScoreRing score={d.complianceScore} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{d.deviceName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {d.user ? `${d.user.firstName} ${d.user.lastName}` : d.hostname || '—'}
                        </p>
                        {failing.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {failing.map(f => (
                              <span key={f} className="text-xs bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Rede (Network Probes) ────────────────────────────────

function ProbesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCIDR, setNewCIDR] = useState('');
  const [expandedProbe, setExpandedProbe] = useState<string | null>(null);

  const { data: probesData, isLoading } = useQuery({
    queryKey: ['iguard', 'probes'],
    queryFn: () => iGuardApi.listProbes().then(r => r.data),
  });

  const { data: probeDevicesData } = useQuery({
    queryKey: ['iguard', 'probes', expandedProbe, 'devices'],
    queryFn: () => iGuardApi.getProbeDevices(expandedProbe!).then(r => r.data),
    enabled: !!expandedProbe,
  });

  const createMutation = useMutation({
    mutationFn: () => iGuardApi.createProbe({ name: newName, subnetCIDR: newCIDR }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iguard', 'probes'] });
      setShowForm(false); setNewName(''); setNewCIDR('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => iGuardApi.deleteProbe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iguard', 'probes'] }),
  });

  const probes: NetworkProbe[] = probesData?.data ?? probesData ?? [];
  const probeDevices: DiscoveredDevice[] = probeDevicesData?.data ?? probeDevicesData ?? [];

  const categoryIcon: Record<string, string> = {
    firewall: '🔥', switch: '🔀', router: '🌐', server: '🖥️', printer: '🖨️', unknown: '❓',
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          As Network Probes fazem scan agentless da rede via Nmap/SNMP e reportam dispositivos descobertos.
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Probe
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Nova Network Probe</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="ex: Escritório Lisboa"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subnet CIDR</label>
              <input
                value={newCIDR} onChange={e => setNewCIDR(e.target.value)}
                placeholder="ex: 192.168.1.0/24"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newName || !newCIDR || createMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Criar Probe
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(''); setNewCIDR(''); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Probes list */}
      {probes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          <Network className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">Nenhuma Network Probe configurada</p>
          <p className="text-xs mt-1">Crie uma probe para descobrir dispositivos de rede automaticamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {probes.map(probe => {
            const isExpanded = expandedProbe === probe.id;
            return (
              <div key={probe.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full flex-shrink-0',
                    probe.status === 'ACTIVE' ? 'bg-green-500' :
                    probe.status === 'ERROR'  ? 'bg-red-500' : 'bg-gray-300',
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{probe.name}</p>
                      <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{probe.subnetCIDR}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {probe._count?.discoveredDevices ?? 0} dispositivos descobertos
                      {probe.lastScannedAt && ` · último scan ${new Date(probe.lastScannedAt).toLocaleDateString('pt-PT')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedProbe(isExpanded ? null : probe.id)}
                      className="text-xs text-primary underline hover:no-underline"
                    >
                      {isExpanded ? 'Fechar' : 'Ver dispositivos'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Eliminar probe "${probe.name}"?`)) deleteMutation.mutate(probe.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Probe install token */}
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-500 mb-1">Token da probe (use no script de instalação):</p>
                  <code className="text-xs font-mono bg-gray-50 border border-gray-100 rounded px-2 py-1 text-gray-700 break-all">
                    {probe.probeToken}
                  </code>
                </div>

                {/* Expanded devices */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <h4 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
                      <Wifi className="w-3.5 h-3.5" />
                      Dispositivos Descobertos
                    </h4>
                    {probeDevices.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Nenhum dispositivo descoberto ainda. Aguarde o próximo scan.</p>
                    ) : (
                      <div className="space-y-2">
                        {probeDevices.map(d => (
                          <div key={d.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-3">
                            <span className="text-lg">{categoryIcon[d.deviceCategory ?? 'unknown'] ?? '❓'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium text-gray-900">{d.ipAddress}</span>
                                {d.hostname && <span className="text-xs text-gray-400">{d.hostname}</span>}
                                {d.isManaged && (
                                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">Gerido</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {[d.vendor, d.os, d.firmwareVersion].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            {d.riskScore !== undefined && (
                              <div className={cn(
                                'text-xs font-bold px-2 py-1 rounded-full',
                                d.riskScore >= 70 ? 'bg-red-50 text-red-700' :
                                d.riskScore >= 40 ? 'bg-amber-50 text-amber-700' :
                                'bg-green-50 text-green-700',
                              )}>
                                {d.riskScore}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Install instructions */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Network className="w-4 h-4" />
          Como instalar uma Network Probe
        </h3>
        <ol className="space-y-2 text-xs text-blue-800">
          <li><span className="font-bold">1.</span> Crie uma probe acima e copie o seu token.</li>
          <li><span className="font-bold">2.</span> Instale o iguard-probe num servidor Linux dentro da subnet que pretende monitorizar:</li>
        </ol>
        <div className="mt-3 bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-100">
          curl -fsSL https://iguard.icomply.pt/probe.sh | sudo bash -s -- --token TOKEN
        </div>
        <p className="mt-2 text-xs text-blue-600">
          A probe usa Nmap para descobrir dispositivos e SNMP para obter informação de firmware em switches/routers Cisco/HP.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

const FALLBACK_STATS: OrgStats = {
  total: 0, active: 0, compliant: 0, nonCompliant: 0, avgScore: 0,
  checkStats: { diskEncryption: 0, screenLock: 0, antivirusEnabled: 0, osUpToDate: 0 },
};

export default function IGuardPage() {
  const [tab, setTab] = useState<'endpoints' | 'servers' | 'stats' | 'network'>('endpoints');
  const qc = useQueryClient();

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['iguard', 'devices'],
    queryFn: () => iGuardApi.listDevices().then(r => r.data),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['iguard', 'stats'],
    queryFn: () => iGuardApi.getStats().then(r => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => iGuardApi.revokeDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iguard'] });
    },
  });

  const allDevices: DeviceAgent[] = devicesData?.data ?? devicesData ?? [];
  const endpoints = allDevices.filter(d => !d.deviceType || d.deviceType === 'ENDPOINT');
  const servers   = allDevices.filter(d => d.deviceType === 'SERVER');
  const stats: OrgStats = statsData ?? FALLBACK_STATS;

  function handleRevoke(id: string) {
    const confirmed = window.confirm(
      'Tem a certeza que pretende revogar este dispositivo? O agente iGuard será desativado neste equipamento.',
    );
    if (confirmed) revokeMutation.mutate(id);
  }

  const tabs = [
    { key: 'endpoints', label: 'Endpoints',    icon: <Monitor className="w-3.5 h-3.5" />,  count: endpoints.length },
    { key: 'servers',   label: 'Servidores',   icon: <Server  className="w-3.5 h-3.5" />,  count: servers.length },
    { key: 'stats',     label: 'Estatísticas', icon: <Shield  className="w-3.5 h-3.5" />,  count: null },
    { key: 'network',   label: 'Rede',         icon: <Network className="w-3.5 h-3.5" />,  count: null },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IGuardLogo size={44} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">iGuard — Monitorização</h1>
            <p className="text-sm text-gray-500">Conformidade de endpoints, servidores e rede</p>
          </div>
        </div>
        <Link
          href="/iguard/install"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
        >
          <Download className="w-4 h-4" />
          Instalar iGuard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'endpoints' && (
        <DevicesTab
          devices={endpoints}
          isLoading={devicesLoading}
          onRevoke={handleRevoke}
        />
      )}

      {tab === 'servers' && (
        <DevicesTab
          devices={servers}
          isLoading={devicesLoading}
          onRevoke={handleRevoke}
        />
      )}

      {tab === 'stats' && (
        statsLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <StatsTab stats={stats} devices={allDevices} />
        )
      )}

      {tab === 'network' && <ProbesTab />}
    </div>
  );
}
