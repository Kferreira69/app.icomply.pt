'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Monitor,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react';
import { IGuardLogo } from '@/components/iguard/IGuardLogo';
import { iGuardApi } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────

interface DeviceInfo {
  id: string;
  deviceName: string;
  os: string;
  status: 'ACTIVE' | 'PENDING' | 'REVOKED';
  lastSeen?: string;
  complianceScore?: number;
}

type OsTab = 'macos' | 'windows';

// ── Helpers ───────────────────────────────────────────────────

function detectOs(): OsTab {
  if (typeof navigator === 'undefined') return 'windows';
  return /Mac/i.test(navigator.userAgent) ? 'macos' : 'windows';
}

// ── Sub-components ────────────────────────────────────────────

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono text-gray-100 overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function IGuardInstallPage() {
  const [activeTab, setActiveTab] = useState<OsTab>('windows');
  const [token, setToken] = useState<string | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  useEffect(() => {
    setActiveTab(detectOs());
  }, []);

  // Check if device already registered
  const {
    data: myDevice,
    isLoading: deviceLoading,
    refetch: refetchDevice,
  } = useQuery<DeviceInfo | null>({
    queryKey: ['iguard-my-device'],
    queryFn: async () => {
      try {
        const res = await iGuardApi.getMyDevice();
        return res.data ?? null;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  // Register device mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const os = detectOs(); // already 'macos' | 'windows' — lowercase
      const res = await iGuardApi.registerDevice({
        deviceName: (typeof navigator !== 'undefined' ? navigator.platform : null) || os,
        os,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      const tok = data?.deviceToken ?? data?.token ?? null;
      if (tok) setToken(tok);
      setTokenVisible(false);
    },
  });

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const displayToken = token
    ? tokenVisible ? token : token.slice(0, 8) + '••••••••••••'
    : null;

  const tok = token || 'SEU_TOKEN';

  const macosScript = `curl -fsSL https://iguard.icomply.pt/install.sh | bash -s -- --token ${tok}`;

  const windowsRunCmd = `iguard.exe /?token=${tok}`;

  const WINDOWS_EXE_URL =
    'https://github.com/Kferreira69/app.icomply.pt/releases/latest/download/iguard-windows-amd64.exe';
  const MACOS_ARM_URL =
    'https://github.com/Kferreira69/app.icomply.pt/releases/latest/download/iguard-darwin-arm64';
  const MACOS_X64_URL =
    'https://github.com/Kferreira69/app.icomply.pt/releases/latest/download/iguard-darwin-amd64';

  const alreadyActive = !deviceLoading && myDevice?.status === 'ACTIVE' && !token;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center mb-6 drop-shadow-xl">
            <IGuardLogo size={80} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Instalar o iGuard</h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto mb-6">
            O iGuard monitoriza o estado de conformidade do seu dispositivo de forma segura e privada.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-sm text-blue-50">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              O iGuard verifica apenas configurações de segurança. Nunca acede a ficheiros pessoais,
              histórico de navegação ou comunicações.
            </span>
          </div>
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 -mt-6 space-y-6">

        {/* ── Step 1: Token ────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-bold">
                1
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Gerar token de instalação
              </h2>
            </div>
          </div>

          <div className="p-6">
            {/* Already installed */}
            {alreadyActive && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    iGuard já instalado neste dispositivo
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    {myDevice?.name} — {myDevice?.os}
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                  Activo
                </span>
              </div>
            )}

            {/* Token box */}
            {token && (
              <div className="mb-4">
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-gray-950 border border-gray-700">
                  <code className="flex-1 font-mono text-sm text-green-400 break-all">
                    {displayToken}
                  </code>
                  <button
                    onClick={() => setTokenVisible((v) => !v)}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors shrink-0"
                    title={tokenVisible ? 'Ocultar token' : 'Mostrar token'}
                  >
                    {tokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shrink-0"
                  >
                    {tokenCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {tokenCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Guarde este token — só é mostrado uma vez
                </div>
              </div>
            )}

            <button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {registerMutation.isPending
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <ShieldCheck className="w-4 h-4" />}
              {token ? 'Gerar novo token' : 'Gerar token'}
            </button>

            {registerMutation.isError && (
              <p className="mt-2 text-xs text-red-500">
                Erro ao gerar token. Por favor tente novamente.
              </p>
            )}
          </div>
        </div>

        {/* ── Step 2: Download & Install ───────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-bold">
                2
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Descarregar e instalar
              </h2>
            </div>
          </div>

          <div className="p-6">
            {/* OS Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('windows')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  activeTab === 'windows'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-base">🪟</span> Windows
              </button>
              <button
                onClick={() => setActiveTab('macos')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  activeTab === 'macos'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-base">🍎</span> macOS
              </button>
            </div>

            {/* Windows */}
            {activeTab === 'windows' && (
              <div className="space-y-5">
                {/* Download button */}
                <div>
                  <a
                    href={WINDOWS_EXE_URL}
                    download="iguard.exe"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Descarregar iGuard.exe
                  </a>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Windows 10/11 · 64-bit · ~12 MB
                  </p>
                </div>

                {/* Run command */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Execute como Administrador na pasta onde descarregou:
                  </p>
                  <CodeBlock code={windowsRunCmd} language="cmd" />
                  {!token && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Gere o token no passo 1 primeiro — o comando acima será actualizado automaticamente.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                  <Monitor className="w-4 h-4 shrink-0" />
                  Clique com o botão direito no iguard.exe → «Executar como administrador»
                </div>
              </div>
            )}

            {/* macOS */}
            {activeTab === 'macos' && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instalar via Terminal (uma linha)
                  </p>
                  <CodeBlock code={macosScript} language="bash" />
                  {!token && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Gere o token no passo 1 — o comando acima será actualizado automaticamente.
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white dark:bg-gray-900 text-xs text-gray-400">
                      ou descarregar manualmente
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={MACOS_ARM_URL}
                    download="iguard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Apple Silicon (M1/M2/M3)
                  </a>
                  <a
                    href={MACOS_X64_URL}
                    download="iguard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Intel (x64)
                  </a>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                  <Monitor className="w-4 h-4 shrink-0" />
                  O Terminal pode pedir a palavra-passe de administrador para instalar o serviço.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 3: Verify ───────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-bold">
                3
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Verificar instalação
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <button
              onClick={() => refetchDevice()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${deviceLoading ? 'animate-spin' : ''}`} />
              Verificar instalação
            </button>

            {/* ACTIVE */}
            {!deviceLoading && myDevice?.status === 'ACTIVE' && (
              <div className="p-5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
                      iGuard activo e a reportar
                    </p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <dt className="text-green-600 dark:text-green-500 font-medium">Dispositivo</dt>
                        <dd className="text-green-800 dark:text-green-300 mt-0.5">{myDevice.deviceName}</dd>
                      </div>
                      <div>
                        <dt className="text-green-600 dark:text-green-500 font-medium">Sistema</dt>
                        <dd className="text-green-800 dark:text-green-300 mt-0.5">{myDevice.os}</dd>
                      </div>
                      {myDevice.lastSeen && (
                        <div>
                          <dt className="text-green-600 dark:text-green-500 font-medium">Último reporte</dt>
                          <dd className="text-green-800 dark:text-green-300 mt-0.5">
                            {new Date(myDevice.lastSeen).toLocaleString('pt-PT')}
                          </dd>
                        </div>
                      )}
                      {myDevice.complianceScore !== undefined && (
                        <div>
                          <dt className="text-green-600 dark:text-green-500 font-medium">Score</dt>
                          <dd className="text-green-800 dark:text-green-300 mt-0.5 font-semibold">
                            {myDevice.complianceScore}%
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {/* PENDING */}
            {!deviceLoading && myDevice?.status === 'PENDING' && (
              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      iGuard instalado mas ainda não reportou
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Pode demorar alguns minutos. Aguarde e verifique novamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* NOT FOUND */}
            {!deviceLoading && !myDevice && (
              <div className="p-5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Dispositivo não detectado
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Siga os passos acima para instalar o iGuard.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Privacy transparency ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              O que o iGuard verifica
            </h3>
            <ul className="space-y-3">
              {[
                { icon: '🔒', label: 'Encriptação de disco (BitLocker / FileVault)' },
                { icon: '🔐', label: 'Screen lock e timeout automático' },
                { icon: '🛡️', label: 'Software antivírus instalado e activo' },
                { icon: '🔄', label: 'Actualizações do sistema operativo' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-base leading-none mt-0.5">{item.icon}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <X className="w-4 h-4 text-red-500" />
              O que o iGuard NÃO verifica
            </h3>
            <ul className="space-y-3">
              {[
                'Ficheiros pessoais ou documentos',
                'Histórico de navegação',
                'Emails ou mensagens',
                'Actividade de teclado ou ecrã',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="text-red-400 font-bold leading-none mt-0.5">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
