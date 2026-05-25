import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST', '');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER', '');
    const pass = this.config.get<string>('SMTP_PASS', '');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — emails will be logged only');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private get from(): string {
    return this.config.get<string>('SMTP_FROM', 'iComply <noreply@app.icomply.pt>');
  }

  private get appUrl(): string {
    return this.config.get<string>('APP_URL', 'https://app.icomply.pt');
  }

  private get frontendUrl(): string {
    // Derive frontend URL from APP_URL (api. → app.)
    const apiUrl = this.appUrl;
    return apiUrl.replace('https://api.', 'https://');
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      // Don't throw — email failure should not break the API response
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    await this.send(
      email,
      'Redefinição de password — iComply',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Redefinição de password</h2>
        <p>Recebemos um pedido de redefinição da sua password. Clique no botão abaixo para continuar:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px;
                    text-decoration: none; font-weight: bold;">
            Redefinir password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Este link é válido durante 1 hora.<br>
          Se não solicitou esta alteração, pode ignorar este email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
      `,
    );
  }

  async sendInvite(email: string, token: string, invitedBy: string, orgName: string): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/accept-invite?token=${token}`;

    await this.send(
      email,
      `Convite para ${orgName} — iComply`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Foi convidado para ${orgName}</h2>
        <p><strong>${invitedBy}</strong> convidou-o para a plataforma iComply.</p>
        <p>Clique no botão abaixo para criar a sua conta e começar:</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px;
                    text-decoration: none; font-weight: bold;">
            Aceitar convite
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Este convite é válido durante 7 dias.<br>
          Se não esperava este email, pode ignorá-lo com segurança.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
      `,
    );
  }

  async sendNotification(email: string, title: string, message: string): Promise<void> {
    await this.send(
      email,
      `${title} — iComply`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">${title}</h2>
        <p>${message}</p>
        <p style="margin: 24px 0;">
          <a href="${this.frontendUrl}"
             style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px;
                    text-decoration: none; font-weight: bold;">
            Ver na plataforma
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
      `,
    );
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    await this.send(
      email,
      'Bem-vindo ao iComply!',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Bem-vindo, ${firstName}!</h2>
        <p>A sua conta iComply está activa. Pode agora iniciar sessão e começar a gerir a conformidade da sua organização.</p>
        <p style="margin: 24px 0;">
          <a href="${this.frontendUrl}"
             style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px;
                    text-decoration: none; font-weight: bold;">
            Entrar na plataforma
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">iComply Compliance Operating System</p>
      </div>
      `,
    );
  }
}
