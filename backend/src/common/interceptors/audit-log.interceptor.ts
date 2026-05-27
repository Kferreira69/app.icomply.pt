// Audit interceptor — RGPD Art. 30 + ISO 27001
// Log de todas as operações com sanitização de PII
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Endpoints cujo body NÃO deve ser logado (contêm passwords ou dados sensíveis)
const SKIP_BODY_LOG = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/change-password',
  '/auth/accept-invite',
];

// Campos a redactar no body antes de logar
const SENSITIVE_FIELDS = [
  'password', 'passwordHash', 'currentPassword', 'newPassword',
  'token', 'secret', 'accessToken', 'refreshToken',
  'creditCard', 'nif', 'iban', 'inviteToken',
];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userId = (request as any).user?.id || 'anonymous';
    const requestId = uuidv4();
    const startTime = Date.now();

    // X-Request-Id no header — útil para correlacionar logs com o cliente
    response.setHeader('X-Request-Id', requestId);

    const shouldLogBody = !SKIP_BODY_LOG.some(path => url.includes(path));
    const sanitizedBody = shouldLogBody
      ? this.sanitizeBody(request.body)
      : '[REDACTED]';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          JSON.stringify({
            requestId,
            type: 'REQUEST',
            method,
            url,
            userId,
            ip: this.maskIp(ip ?? ''),
            duration: `${duration}ms`,
            status: response.statusCode,
            timestamp: new Date().toISOString(),
            ...(shouldLogBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
              ? { body: sanitizedBody }
              : {}),
          }),
        );
      }),
      catchError((err) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          JSON.stringify({
            requestId,
            type: 'ERROR',
            method,
            url,
            userId,
            ip: this.maskIp(ip ?? ''),
            duration: `${duration}ms`,
            error: err?.message ?? String(err),
            timestamp: new Date().toISOString(),
          }),
        );
        return throwError(() => err);
      }),
    );
  }

  /** Remove campos sensíveis antes de logar o body */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    for (const field of SENSITIVE_FIELDS) {
      if (field in sanitized) sanitized[field] = '[REDACTED]';
    }
    return sanitized;
  }

  /**
   * Mascara o último octeto do IP — conformidade RGPD
   * 192.168.1.100 → 192.168.1.xxx
   */
  private maskIp(ip: string): string {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    // IPv6: mascarar após o último ':'
    const colonIdx = ip.lastIndexOf(':');
    return colonIdx >= 0 ? ip.substring(0, colonIdx + 1) + 'xxxx' : ip;
  }
}
