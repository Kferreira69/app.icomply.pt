import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiAssistantService } from './ai-assistant.service';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface ChatDto { messages: ChatMessage[]; currentModule?: string; }

@ApiTags('AI Assistant')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly service: AiAssistantService) {}

  @Post('chat')
  async chat(@Request() req: any, @Body() body: ChatDto) {
    const reply = await this.service.chat(req.user.organizationId, body.messages, body.currentModule);
    return { reply };
  }

  @Post('generate-policy')
  @ApiOperation({ summary: 'Generate a policy draft using AI' })
  async generatePolicy(@Request() req: any, @Body() body: { policyType: string; framework: string; language?: string }) {
    const prompt = `Gera um borrador completo de política de ${body.policyType} para conformidade com ${body.framework}.

A política deve incluir:
1. Âmbito e objetivos
2. Definições e terminologia
3. Responsabilidades (owner, DPO/CISO quando aplicável)
4. Requisitos e medidas concretas mapeadas aos controlos do ${body.framework}
5. Procedimentos de revisão e atualização
6. Consequências do incumprimento
7. Referências normativas

Formate como documento de política profissional. Língua: ${body.language || 'português europeu'}.`;

    const reply = await this.service.chat(req.user.organizationId, [{ role: 'user', content: prompt }], body.framework.toLowerCase());
    return { policy: reply, policyType: body.policyType, framework: body.framework };
  }

  @Post('gap-analysis')
  @ApiOperation({ summary: 'Generate a gap analysis against a framework' })
  async gapAnalysis(@Request() req: any, @Body() body: { framework: string }) {
    const prompt = `Faz uma análise de gap detalhada da nossa organização face ao ${body.framework}.

Para cada área/domínio do framework, indica:
1. Nível atual de conformidade (CONFORME / PARCIAL / GAP / N/A)
2. Evidência disponível vs. evidência em falta
3. Prioridade de ação (CRÍTICO / ALTO / MÉDIO / BAIXO)
4. Ação recomendada específica com responsável sugerido

Termina com os TOP 5 próximos passos prioritários para atingir conformidade.`;

    const reply = await this.service.chat(req.user.organizationId, [{ role: 'user', content: prompt }], body.framework.toLowerCase());
    return { analysis: reply, framework: body.framework };
  }

  @Post('audit-prep')
  @ApiOperation({ summary: 'Generate audit preparation checklist' })
  async auditPrep(@Request() req: any, @Body() body: { framework: string; auditType: string }) {
    const prompt = `Prepara um checklist detalhado de preparação para auditoria ${body.auditType} do ${body.framework}.

Inclui:
1. Documentos e evidências que o auditor irá solicitar (lista exaustiva)
2. Áreas de risco onde a nossa organização pode ter debilidades
3. Prováveis perguntas do auditor e respostas sugeridas baseadas no nosso estado atual
4. Lista de verificação pré-auditoria (7 dias antes, 3 dias antes, dia da auditoria)
5. Contactos e responsáveis que devem estar disponíveis durante a auditoria`;

    const reply = await this.service.chat(req.user.organizationId, [{ role: 'user', content: prompt }], body.framework.toLowerCase());
    return { checklist: reply, framework: body.framework };
  }
}
