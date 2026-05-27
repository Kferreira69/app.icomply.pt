import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly anthropicKey: string | undefined;
  private readonly openaiKey: string | undefined;
  private readonly anthropicUrl = 'https://api.anthropic.com/v1/messages';
  private readonly openaiUrl   = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.openaiKey    = this.config.get<string>('OPENAI_API_KEY');
  }

  // ── Build rich org context for system prompt ─────────────────

  private async buildOrgContext(organizationId: string): Promise<string> {
    const [org, projects, riskCounts, taskCounts, auditCount, evidencePending] =
      await Promise.all([
        this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, industry: true, country: true, aiProvider: true, aiModel: true },
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

    const riskSummary = riskCounts.map((r) => `${r.status}: ${r._count.id}`).join(', ');
    const taskSummary = taskCounts.map((t) => `${t.status}: ${t._count.id}`).join(', ');

    return [
      `Organização: ${org?.name ?? 'N/A'} | Setor: ${org?.industry ?? 'N/A'} | País: ${org?.country ?? 'PT'}`,
      ``,
      `Projetos de conformidade ativos (${projects.length}):`,
      ...projectDetails,
      ``,
      `Riscos: ${riskSummary || 'nenhum registado'}`,
      `Tarefas: ${taskSummary || 'nenhuma registada'}`,
      `Auditorias em curso: ${auditCount}`,
      `Evidências pendentes de aprovação: ${evidencePending}`,
    ].join('\n');
  }

  private buildSystemPrompt(context: string): string {
    return `És um assistente especializado em conformidade regulatória chamado "iComply AI". Ajudas gestores de conformidade a navegar frameworks como ISO 27001, GDPR, NIS2, DORA, ISO 9001 e RGPC.

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
  }

  // ── Anthropic ────────────────────────────────────────────────

  private async chatWithAnthropic(
    messages: ChatMessage[],
    systemPrompt: string,
    model?: string | null,
  ): Promise<string> {
    if (!this.anthropicKey) throw new Error('ANTHROPIC_API_KEY não configurada');

    const response = await fetch(this.anthropicUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic ${response.status}: ${err}`);
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = result.content.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('Resposta vazia da Anthropic');
    return text;
  }

  // ── OpenAI ───────────────────────────────────────────────────

  private async chatWithOpenAI(
    messages: ChatMessage[],
    systemPrompt: string,
    model?: string | null,
  ): Promise<string> {
    if (!this.openaiKey) throw new Error('OPENAI_API_KEY não configurada');

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(this.openaiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        max_tokens: 2048,
        messages: openaiMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI ${response.status}: ${err}`);
    }

    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = result.choices?.[0]?.message?.content;
    if (!text) throw new Error('Resposta vazia da OpenAI');
    return text;
  }

  // ── Main chat method ─────────────────────────────────────────

  async chat(
    organizationId: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiProvider: true, aiModel: true },
    });

    const provider = org?.aiProvider || 'AUTO';
    const model    = org?.aiModel || null;

    const context      = await this.buildOrgContext(organizationId);
    const systemPrompt = this.buildSystemPrompt(context);

    // ANTHROPIC only
    if (provider === 'ANTHROPIC') {
      if (!this.anthropicKey) {
        throw new InternalServerErrorException(
          'ANTHROPIC_API_KEY não está configurada. Adicione-a ao ficheiro .env do servidor.',
        );
      }
      return this.chatWithAnthropic(messages, systemPrompt, model);
    }

    // OPENAI only
    if (provider === 'OPENAI') {
      if (!this.openaiKey) {
        throw new InternalServerErrorException(
          'OPENAI_API_KEY não está configurada. Adicione-a ao ficheiro .env do servidor.',
        );
      }
      return this.chatWithOpenAI(messages, systemPrompt, model);
    }

    // AUTO — try Anthropic first, fall back to OpenAI
    if (this.anthropicKey) {
      try {
        return await this.chatWithAnthropic(messages, systemPrompt, model);
      } catch (e: any) {
        this.logger.warn(`Anthropic falhou, a tentar OpenAI: ${e.message}`);
        if (this.openaiKey) {
          return this.chatWithOpenAI(messages, systemPrompt, model);
        }
        throw new InternalServerErrorException(`Anthropic error: ${e.message}`);
      }
    }

    if (this.openaiKey) {
      return this.chatWithOpenAI(messages, systemPrompt, model);
    }

    throw new InternalServerErrorException(
      'Nenhum provider de IA configurado. Adicione ANTHROPIC_API_KEY ou OPENAI_API_KEY ao .env do servidor.',
    );
  }
}
