import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiAssistantService {
  private readonly anthropicKey: string | undefined;
  private readonly anthropicUrl = 'https://api.anthropic.com/v1/messages';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
  }

  // ── Build rich org context for system prompt ─────────────────

  private async buildOrgContext(organizationId: string): Promise<string> {
    const [org, projects, riskCounts, taskCounts, auditCount, evidencePending] =
      await Promise.all([
        this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, industry: true, country: true },
        }),
        this.prisma.project.findMany({
          where: { organizationId, status: { not: 'ARCHIVED' } },
          include: { framework: { select: { name: true, code: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.risk.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { id: true },
        }),
        this.prisma.task.groupBy({
          by: ['status'],
          where: { project: { organizationId } },
          _count: { id: true },
        }),
        this.prisma.audit.count({
          where: { organizationId, status: 'IN_PROGRESS' },
        }),
        this.prisma.evidence.count({
          where: { uploadedBy: { organizationId }, status: 'PENDING' },
        }),
      ]);

    // Compute project compliance scores
    const projectDetails = await Promise.all(
      projects.map(async (p) => {
        const [total, done] = await Promise.all([
          this.prisma.task.count({ where: { projectId: p.id } }),
          this.prisma.task.count({ where: { projectId: p.id, status: 'DONE' } }),
        ]);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return `  - ${p.name} (${p.framework?.code ?? 'sem framework'}): ${pct}% completo, status: ${p.status}`;
      }),
    );

    const riskSummary = riskCounts
      .map((r) => `${r.status}: ${r._count.id}`)
      .join(', ');

    const taskSummary = taskCounts
      .map((t) => `${t.status}: ${t._count.id}`)
      .join(', ');

    const lines = [
      `Organização: ${org?.name ?? 'N/A'} | Setor: ${org?.industry ?? 'N/A'} | País: ${org?.country ?? 'PT'}`,
      ``,
      `Projetos de conformidade ativos (${projects.length}):`,
      ...projectDetails,
      ``,
      `Riscos: ${riskSummary || 'nenhum registado'}`,
      `Tarefas: ${taskSummary || 'nenhuma registada'}`,
      `Auditorias em curso: ${auditCount}`,
      `Evidências pendentes de aprovação: ${evidencePending}`,
    ];

    return lines.join('\n');
  }

  // ── Main chat method ─────────────────────────────────────────

  async chat(
    organizationId: string,
    messages: ChatMessage[],
  ): Promise<string> {
    if (!this.anthropicKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY não está configurada. Adicione-a ao ficheiro .env do servidor.',
      );
    }

    const context = await this.buildOrgContext(organizationId);

    const systemPrompt = `És um assistente especializado em conformidade regulatória chamado "iComply AI". Ajudas gestores de conformidade a navegar frameworks como ISO 27001, GDPR, NIS2, DORA, ISO 9001 e RGPC.

CONTEXTO ATUAL DA ORGANIZAÇÃO:
${context}

INSTRUÇÕES:
- Responde sempre em português europeu (não brasileiro)
- Baseia as tuas respostas nos dados reais da organização quando relevante
- Sê direto e prático — fornece passos acionáveis
- Quando citares requisitos regulatórios, indica o artigo ou cláusula específica
- Se não souberes algo com certeza, diz-o claramente
- Mantém um tom profissional mas acessível
- Formata respostas longas com títulos e listas quando apropriado`;

    const response = await fetch(this.anthropicUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new InternalServerErrorException(
        `Anthropic API error ${response.status}: ${errText}`,
      );
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = result.content.find((c) => c.type === 'text')?.text;
    if (!text) throw new InternalServerErrorException('Resposta vazia da IA');

    return text;
  }
}
