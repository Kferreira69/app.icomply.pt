// src/common/interceptors/audit.interceptor.ts
// Log de auditoria para todas as operações (RGPD Art. 30 + ISO 27001)
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Endpoints a NÃO logar (evitar PII em logs)
const SKIP_BODY_LOG = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

// Campos a mascarar no body
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'secret', 'creditCard', 'nif', 'iban'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userId = (request as any).user?.id || 'anonymous';
    const requestId = uuidv4();
    const startTime = Date.now();

    // Adicionar requestId ao header de resposta (útil para debug)
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Request-Id', requestId);

    // Não logar passwords nem dados sensíveis
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
            ip: this.maskIp(ip),     // mascarar último octeto (RGPD)
            duration: `${duration}ms`,
            status: response.statusCode,
            timestamp: new Date().toISOString(),
            // body apenas em endpoints seguros e métodos de escrita
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
            ip: this.maskIp(ip),
            duration: `${duration}ms`,
            error: err.message,
            timestamp: new Date().toISOString(),
          }),
        );
        return throwError(() => err);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    for (const field of SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  // Mascarar último octeto do IP para conformidade com RGPD
  private maskIp(ip: string): string {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return ip.substring(0, ip.lastIndexOf(':') + 1) + 'xxxx'; // IPv6
  }
}
