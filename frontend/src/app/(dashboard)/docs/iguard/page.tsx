'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Terminal, Download, Shield, Server, Network,
  ChevronRight, Copy, Check, AlertTriangle, Info,
} from 'lucide-react';

// ── Code Block ────────────────────────────────────────────────
function Code({ children, lang = 'bash' }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 my-3">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2">
        <span className="text-xs text-gray-400 font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          {copied ? <><Check className="w-3 h-3 text-green-400" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
        </button>
      </div>
      <pre className="bg-gray-950 text-gray-100 text-sm font-mono p-4 overflow-x-auto leading-relaxed whitespace-pre">{children}</pre>
    </div>
  );
}

function Note({ type = 'info', children }: { type?: 'info' | 'warn'; children: React.ReactNode }) {
  const styles = type === 'warn'
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';
  const Icon = type === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`flex gap-3 p-4 rounded-xl border my-3 text-sm ${styles}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Nav sections ──────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',     label: 'Visão Geral' },
  { id: 'install',      label: 'Instalação' },
  { id: 'commands',     label: 'Comandos' },
  { id: 'server-mode',  label: 'Modo Servidor' },
  { id: 'probes',       label: 'Sondas de Rede' },
  { id: 'checks',       label: 'Verificações' },
  { id: 'troubleshoot', label: 'Problemas Comuns' },
];

export default function IGuardDocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-8">
        {/* Sidebar nav */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">iGuard Docs</span>
            </div>
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeSection === s.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <Link href="/iguard/install" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                <Download className="w-3.5 h-3.5" /> Instalar iGuard
              </Link>
              <Link href="/docs/api" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 mt-2">
                <ChevronRight className="w-3.5 h-3.5" /> Documentação API
              </Link>
              <Link href="/help" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 mt-2">
                <ChevronRight className="w-3.5 h-3.5" /> Centro de Ajuda
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12 py-2">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <Link href="/help" className="hover:text-gray-600">Ajuda</Link>
              <ChevronRight className="w-3 h-3" />
              <span>iGuard</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">iGuard — Documentação Técnica</h1>
            <p className="text-gray-500 mt-2">Agente de conformidade de dispositivos e servidores da iComply.</p>
          </div>

          {/* Overview */}
          <section id="overview">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Visão Geral</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              O <strong>iGuard</strong> é um agente leve em Go que corre nos dispositivos da tua organização e envia
              relatórios de conformidade em tempo real para a plataforma iComply. Suporta dois modos de operação:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900 text-sm">Modo Endpoint</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">Para portáteis e workstations de utilizadores. Verifica encriptação de disco, screen lock, antivírus, actualizações de SO e gestor de passwords.</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-900 text-sm">Modo Servidor</span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">Para servidores Linux/Windows. Verifica acesso SSH root, firewall activa, patches pendentes e portas abertas.</p>
              </div>
            </div>
          </section>

          {/* Install */}
          <section id="install">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" /> Instalação
            </h2>

            <h3 className="font-semibold text-gray-800 mt-4 mb-2">macOS (Apple Silicon / Intel)</h3>
            <Code>{`# Apple Silicon (M1/M2/M3)
curl -fsSL https://app.icomply.pt/downloads/iguard-darwin-arm64 -o /usr/local/bin/iguard
chmod +x /usr/local/bin/iguard

# Intel
curl -fsSL https://app.icomply.pt/downloads/iguard-darwin-amd64 -o /usr/local/bin/iguard
chmod +x /usr/local/bin/iguard

# Configurar (substitui TOKEN pelo token do painel iComply)
iguard setup --token TOKEN --api https://api.icomply.pt/api/v1

# Instalar como serviço (LaunchAgent)
iguard service install`}</Code>

            <h3 className="font-semibold text-gray-800 mt-6 mb-2">Windows</h3>
            <Code lang="powershell">{`# Descarregar (PowerShell como Administrador)
Invoke-WebRequest -Uri "https://app.icomply.pt/downloads/iguard-windows-amd64.exe" \`
  -OutFile "C:\\Program Files\\iGuard\\iguard.exe"

# Configurar
& "C:\\Program Files\\iGuard\\iguard.exe" setup \`
  --token TOKEN --api https://api.icomply.pt/api/v1

# Instalar como serviço Windows
& "C:\\Program Files\\iGuard\\iguard.exe" service install`}</Code>

            <Note type="warn">
              No Windows, o SmartScreen pode alertar para ficheiros executáveis não assinados. Clica em <strong>Mais informações → Executar na mesma</strong>. O iGuard não contém malware — podes verificar o hash SHA256 no painel de administração.
            </Note>

            <h3 className="font-semibold text-gray-800 mt-6 mb-2">Linux (Endpoint)</h3>
            <Code>{`# amd64
curl -fsSL https://app.icomply.pt/downloads/iguard-linux-amd64 -o /usr/local/bin/iguard
chmod +x /usr/local/bin/iguard
iguard setup --token TOKEN --api https://api.icomply.pt/api/v1
iguard service install`}</Code>

            <h3 className="font-semibold text-gray-800 mt-6 mb-2">Linux Servidor (modo server)</h3>
            <Code>{`# Script de instalação (recomendado para servidores)
curl -fsSL https://app.icomply.pt/downloads/iguard-server-linux-amd64 -o /usr/local/bin/iguard
chmod +x /usr/local/bin/iguard

# Configurar em modo servidor
iguard setup --token TOKEN --api https://api.icomply.pt/api/v1 --mode server

# Instalar como systemd service
iguard service install`}</Code>
          </section>

          {/* Commands */}
          <section id="commands">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-600" /> Referência de Comandos
            </h2>

            <div className="space-y-6">
              {[
                {
                  cmd: 'iguard setup',
                  desc: 'Configura o agente com token e URL da API.',
                  flags: [
                    ['--token TOKEN', 'Token de autenticação (obrigatório)'],
                    ['--api URL', 'URL base da API iComply (obrigatório)'],
                    ['--name NOME', 'Nome do dispositivo (default: hostname)'],
                    ['--mode server', 'Configura em modo servidor'],
                  ],
                  example: 'iguard setup --token abc123 --api https://api.icomply.pt/api/v1 --name "MacBook-João"',
                },
                {
                  cmd: 'iguard run',
                  desc: 'Executa verificações de conformidade e envia relatório.',
                  flags: [
                    ['--dry-run', 'Mostra resultados sem enviar à API'],
                    ['--server', 'Força modo servidor nesta execução'],
                  ],
                  example: 'iguard run --dry-run',
                },
                {
                  cmd: 'iguard status',
                  desc: 'Mostra configuração actual e último relatório.',
                  flags: [],
                  example: 'iguard status',
                },
                {
                  cmd: 'iguard service',
                  desc: 'Gere o serviço em background (systemd / LaunchAgent / Windows Service).',
                  flags: [
                    ['install', 'Instala e activa o serviço'],
                    ['uninstall', 'Remove o serviço'],
                    ['start', 'Inicia o serviço'],
                    ['stop', 'Para o serviço'],
                  ],
                  example: 'iguard service install',
                },
                {
                  cmd: 'iguard version',
                  desc: 'Mostra a versão do agente.',
                  flags: [],
                  example: 'iguard version',
                },
              ].map(c => (
                <div key={c.cmd} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-900 px-4 py-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-400" />
                    <code className="text-green-400 font-mono font-bold text-sm">{c.cmd}</code>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-3">{c.desc}</p>
                    {c.flags.length > 0 && (
                      <table className="w-full text-xs mb-3">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-1.5 font-semibold text-gray-500 w-1/3">Flag</th>
                            <th className="text-left py-1.5 font-semibold text-gray-500">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.flags.map(([flag, desc]) => (
                            <tr key={flag} className="border-b border-gray-50">
                              <td className="py-1.5 font-mono text-blue-700 pr-4">{flag}</td>
                              <td className="py-1.5 text-gray-600">{desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="bg-gray-950 rounded-lg px-3 py-2">
                      <code className="text-gray-300 font-mono text-xs">{c.example}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Server mode */}
          <section id="server-mode">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-600" /> Modo Servidor
            </h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              O modo servidor executa verificações específicas para infraestrutura, distintas das verificações de endpoint.
              É activado com <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">--mode server</code> no setup ou <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">--server</code> no run.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                { check: 'SSH Root Login', desc: 'Verifica se o login root por SSH está desactivado em /etc/ssh/sshd_config', pts: 25 },
                { check: 'Firewall Activa', desc: 'Detecta UFW, firewalld, iptables (Linux) ou Windows Defender Firewall', pts: 25 },
                { check: 'SO Actualizado', desc: 'Verifica se o sistema operativo tem as últimas actualizações de segurança', pts: 25 },
                { check: 'Patches Pendentes', desc: 'Conta patches de segurança por instalar (apt, yum, Windows Update)', pts: 25 },
              ].map(c => (
                <div key={c.check} className="flex gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">{c.pts}pts</div>
                  <div>
                    <p className="font-semibold text-purple-900 text-sm">{c.check}</p>
                    <p className="text-xs text-purple-700 mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Note>
              Em modo servidor, o score máximo é <strong>100 pontos</strong> (4 verificações × 25 pts cada). As portas abertas são registadas mas não afectam o score directamente — são visíveis no painel iGuard.
            </Note>
          </section>

          {/* Network Probes */}
          <section id="probes">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" /> Sondas de Rede
            </h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              As sondas de rede (Network Probes) fazem scanning activo de subnets para descobrir automaticamente
              dispositivos e avaliar riscos de exposição. São configuradas no painel iGuard → Rede.
            </p>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Fluxo de funcionamento</h3>
              <ol className="space-y-3">
                {[
                  'Cria uma sonda no painel iGuard → tab Rede → Nova sonda (define subnet CIDR ex: 192.168.1.0/24)',
                  'Copia o token da sonda e instala o agente no servidor que fará o scanning',
                  'O agente faz scanning da subnet e reporta dispositivos descobertos (IP, MAC, vendor, OS, portas abertas)',
                  'Dispositivos são classificados automaticamente por risco (score 0–100)',
                  'Dispositivos geridos pelo iGuard aparecem como "Gerido"; outros como "Não gerido"',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-600">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Checks */}
          <section id="checks">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" /> Verificações por Plataforma
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Verificação</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">macOS</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Windows</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Linux</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['Encriptação de disco', '✅ FileVault', '✅ BitLocker', '✅ LUKS', '20'],
                    ['Screen Lock', '✅', '✅', '✅', '20'],
                    ['Antivírus', '✅ XProtect', '✅ Defender', '✅ ClamAV', '20'],
                    ['SO actualizado', '✅', '✅', '✅', '20'],
                    ['Gestor de passwords', '✅ Keychain+', '✅', '✅', '20'],
                    ['SSH Root desactivado', '✅ (server)', '✅ (server)', '✅ (server)', '25'],
                    ['Firewall activa', '✅ (server)', '✅ (server)', '✅ (server)', '25'],
                    ['Patches pendentes', '✅ (server)', '✅ (server)', '✅ (server)', '25'],
                    ['Portas abertas', '✅ (server)', '✅ (server)', '✅ (server)', '—'],
                  ].map(([check, macos, win, linux, pts]) => (
                    <tr key={check} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-700 text-xs">{check}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-500">{macos}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-500">{win}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-500">{linux}</td>
                      <td className="px-4 py-2.5 text-center text-xs font-semibold text-blue-700">{pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshoot">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Problemas Comuns
            </h2>

            <div className="space-y-4">
              {[
                {
                  problem: '"permission denied" ao instalar em macOS/Linux',
                  solution: 'O binário precisa de estar em /usr/local/bin com permissão de execução. Corre com sudo se necessário:\nsudo chmod +x /usr/local/bin/iguard',
                },
                {
                  problem: 'Windows SmartScreen bloqueia o download',
                  solution: 'Clica em "Mais informações" → "Executar na mesma". Isto acontece porque o executável não tem assinatura de código. O iGuard é seguro — podes verificar o hash SHA256.',
                },
                {
                  problem: 'O agente não aparece no painel após setup',
                  solution: 'Corre "iguard run --dry-run" para verificar se há erros de conectividade. Verifica que o token é válido e que o URL da API está correcto.',
                },
                {
                  problem: '"Error: loading config" ao correr o agente',
                  solution: 'O ficheiro de configuração não existe. Corre "iguard setup --token TOKEN --api URL" primeiro.',
                },
                {
                  problem: 'Score sempre 0 em modo servidor',
                  solution: 'Confirma que o agente foi configurado com --mode server. Corre "iguard status" para ver o modo actual.',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">!</span>
                    {item.problem}
                  </p>
                  <Code>{item.solution}</Code>
                </div>
              ))}
            </div>

            <div className="mt-6 p-5 bg-blue-50 border border-blue-100 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-blue-900 text-sm">Ainda com problemas?</p>
                <p className="text-xs text-blue-700 mt-0.5">A equipa iComply responde em até 4 horas úteis.</p>
              </div>
              <a href="mailto:support@icomply.pt?subject=iGuard%20Support"
                className="shrink-0 inline-flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                Contactar suporte
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
