import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// SendGrid loaded dynamically to avoid hard crash if package absent
let sgMail: any = null;
try { sgMail = require('@sendgrid/mail'); } catch {}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly mode: 'sendgrid' | 'smtp' | 'stub';

  constructor(private config: ConfigService) {
    const sgKey  = this.config.get<string>('SENDGRID_API_KEY', '');
    const host   = this.config.get<string>('SMTP_HOST', '');
    const user   = this.config.get<string>('SMTP_USER', '');
    const pass   = this.config.get<string>('SMTP_PASS', '');
    const port   = this.config.get<number>('SMTP_PORT', 587);

    if (sgKey && sgMail) {
      sgMail.setApiKey(sgKey);
      this.mode = 'sendgrid';
      this.logger.log('Mail: SendGrid API mode active');
    } else if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host, port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.mode = 'smtp';
      this.logger.log(`Mail: SMTP mode active (${host}:${port})`);
    } else {
      this.mode = 'stub';
      this.logger.warn(
        'Mail: STUB mode — emails NOT sent. ' +
        'Set SENDGRID_API_KEY or SMTP_HOST+SMTP_USER+SMTP_PASS in .env.production',
      );
    }
  }

  private get from(): string {
    return this.config.get<string>('SMTP_FROM', 'iComply <noreply@app.icomply.pt>');
  }

  private get appUrl(): string {
    return this.config.get<string>('APP_URL', 'https://app.icomply.pt');
  }

  private get frontendUrl(): string {
    return this.appUrl.replace('https://api.', 'https://');
  }

  getMode(): string { return this.mode; }

  async testConnection(): Promise<{ ok: boolean; mode: string; error?: string }> {
    if (this.mode === 'sendgrid') {
      // SendGrid API — no persistent connection to verify; just confirm key is set
      return { ok: true, mode: 'sendgrid' };
    }
    if (this.mode === 'smtp' && this.transporter) {
      try {
        await this.transporter.verify();
        return { ok: true, mode: 'smtp' };
      } catch (err: any) {
        return { ok: false, mode: 'smtp', error: err.message };
      }
    }
    return { ok: false, mode: 'stub', error: 'No mail provider configured' };
  }

  async sendTestEmail(to: string): Promise<{ ok: boolean; mode: string; error?: string }> {
    try {
      await this.send(to, 'iComply — Teste de Email', `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db;">✅ Configuração de Email OK</h2>
          <p>Este é um email de teste enviado pela plataforma iComply.</p>
          <p style="color: #666; font-size: 13px;">Modo: <strong>${this.mode.toUpperCase()}</strong><br>
          Remetente: <strong>${this.from}</strong><br>
          Data/hora: ${new Date().toISOString()}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">iComply Governance Operating System</p>
        </div>
      `);
      return { ok: true, mode: this.mode };
    } catch (err: any) {
      return { ok: false, mode: this.mode, error: err.message };
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.mode === 'stub') {
      this.logger.warn(`[EMAIL STUB — NOT SENT] To: ${to} | Subject: ${subject}`);
      return;
    }

    if (this.mode === 'sendgrid' && sgMail) {
      const msg = { to, from: this.from, subject, html };
      const res = await sgMail.send(msg);
      this.logger.log(`[SendGrid] Sent to ${to} | Status: ${res?.[0]?.statusCode} | Subject: ${subject}`);
      return;
    }

    if (this.mode === 'smtp' && this.transporter) {
      const info = await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`[SMTP] Sent to ${to} | MessageId: ${info.messageId} | Subject: ${subject}`);
      return;
    }

    throw new Error('Mail provider not available');
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.send(email, 'Redefinição de password — iComply', `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Redefinição de password</h2>
        <p>Recebemos um pedido de redefinição da sua password. Clique no botão abaixo para continuar:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Redefinir password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Este link é válido durante 1 hora.<br>Se não solicitou esta alteração, pode ignorar este email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
    `);
  }

  async sendInvite(email: string, token: string, invitedBy: string, orgName: string): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/accept-invite?token=${token}`;
    await this.send(email, `Convite para ${orgName} — iComply`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Foi convidado para ${orgName}</h2>
        <p><strong>${invitedBy}</strong> convidou-o para a plataforma iComply.</p>
        <p>Clique no botão abaixo para criar a sua conta e começar:</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Aceitar convite
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Este convite é válido durante 7 dias.<br>Se não esperava este email, pode ignorá-lo com segurança.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
    `);
  }

  async sendNotification(email: string, title: string, message: string): Promise<void> {
    await this.send(email, `${title} — iComply`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">${title}</h2>
        <p>${message}</p>
        <p style="margin: 24px 0;">
          <a href="${this.frontendUrl}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Ver na plataforma
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Governance Operating System</p>
      </div>
    `);
  }

  async sendWeeklyDigest(email: string, firstName: string, orgName: string, stats: { overdueTasks: number; highRisks: number; openCapas: number; expiringEvidence: number }): Promise<void> {
    const items = [
      stats.overdueTasks     > 0 ? `<li>⏰ <b>${stats.overdueTasks}</b> tarefa(s) em atraso</li>`          : '',
      stats.highRisks        > 0 ? `<li>⚠️ <b>${stats.highRisks}</b> risco(s) alto/crítico</li>`           : '',
      stats.openCapas        > 0 ? `<li>🔧 <b>${stats.openCapas}</b> CAPA(s) em aberto</li>`               : '',
      stats.expiringEvidence > 0 ? `<li>📄 <b>${stats.expiringEvidence}</b> evidência(s) a expirar</li>`   : '',
    ].filter(Boolean).join('\n');

    await this.send(email, `[iComply] Resumo semanal de conformidade — ${orgName}`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Resumo Semanal de Conformidade</h2>
        <p>Olá ${firstName},</p>
        <p>Aqui está o resumo semanal de conformidade para <strong>${orgName}</strong>:</p>
        <ul style="line-height: 2;">${items || '<li>Sem itens pendentes — boa conformidade! ✅</li>'}</ul>
        <p style="margin: 24px 0;">
          <a href="${this.frontendUrl}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Ver na plataforma
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Governance Operating System · Digest semanal</p>
      </div>
    `);
  }

  async sendDsarConfirmation(email: string, subjectName: string, orgName: string, requestId: string): Promise<void> {
    await this.send(email, `Confirmação do seu pedido RGPD — ${orgName}`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Pedido RGPD registado</h2>
        <p>Caro/a ${subjectName},</p>
        <p>Confirmamos a receção do seu pedido de exercício de direitos ao abrigo do RGPD submetido à <strong>${orgName}</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #1a56db; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Referência do pedido</p>
          <p style="margin: 4px 0 0; font-weight: bold; font-family: monospace;">${requestId.substring(0, 8).toUpperCase()}</p>
        </div>
        <p>Nos termos do artigo 12.º do RGPD, a organização tem <strong>30 dias</strong> para responder ao seu pedido.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">Este email foi gerado automaticamente. iComply Governance Operating System.</p>
      </div>
    `);
  }

  async sendAuditorInvite(email: string, auditorName: string, orgName: string, url: string, expiresAt: Date): Promise<void> {
    await this.send(email, `Convite para Portal de Auditoria — ${orgName}`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Acesso ao Portal de Auditoria</h2>
        <p>Olá <strong>${auditorName}</strong>,</p>
        <p>A <strong>${orgName}</strong> partilhou consigo acesso ao portal de auditoria iComply.</p>
        <div style="background: #f0f9ff; border-left: 4px solid #1a56db; padding: 12px; margin: 20px 0;">
          <p style="margin:0; color:#1a56db; font-size:14px;">Acesso válido até: <strong>${expiresAt.toLocaleDateString('pt-PT')}</strong></p>
        </div>
        <p style="margin: 24px 0;"><a href="${url}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Aceder ao Portal</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Governance Operating System</p>
      </div>
    `);
  }

  async sendScheduledReport(email: string, reportName: string, orgName: string, downloadUrl: string, frequency: string): Promise<void> {
    const freqLabel: Record<string, string> = { DAILY: 'diário', WEEKLY: 'semanal', MONTHLY: 'mensal', QUARTERLY: 'trimestral' };
    await this.send(email, `Relatório ${freqLabel[frequency] || frequency} — ${reportName}`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Relatório automático disponível</h2>
        <p>O relatório <strong>${reportName}</strong> para <strong>${orgName}</strong> foi gerado automaticamente.</p>
        ${downloadUrl ? `<p style="margin: 24px 0;"><a href="${downloadUrl}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Descarregar Relatório</a></p>` : ''}
        <p style="margin: 24px 0;"><a href="${this.frontendUrl}/reports" style="color: #1a56db;">Ver todos os relatórios →</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Governance Operating System · Relatório automático ${freqLabel[frequency] || frequency}</p>
      </div>
    `);
  }

  async sendVendorQuestionnaire(email: string, vendorName: string, url: string, expiresAt?: Date): Promise<void> {
    const expiry = expiresAt ? expiresAt.toLocaleDateString('pt-PT') : '30 dias';
    await this.send(email, 'Questionário de Segurança — iComply', `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Questionário de Avaliação de Segurança</h2>
        <p>Foi-lhe enviado um questionário de segurança e conformidade.</p>
        <p>Por favor, preencha o questionário antes de <strong>${expiry}</strong>.</p>
        <p style="margin: 24px 0;"><a href="${url}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Preencher Questionário</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Governance Operating System</p>
      </div>
    `);
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    await this.send(email, 'Bem-vindo ao iComply!', `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Bem-vindo, ${firstName}!</h2>
        <p>A sua conta iComply está activa. Pode agora iniciar sessão e começar a gerir a conformidade da sua organização.</p>
        <p style="margin: 24px 0;">
          <a href="${this.frontendUrl}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Entrar na plataforma
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
    `);
  }
}
