/**
 * Global Audit Interceptor — persists CRUD operations to AuditLog table.
 * Runs after every successful POST/PUT/PATCH/DELETE.
 * Never blocks the response (wrapped in try/catch).
 * Skips GET requests and /auth routes.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes that should NOT generate database audit entries
const SKIP_PATHS = ['/auth/', '/health'];

// Map HTTP method → audit action verb
function methodToAction(method: string): string {
  switch (method) {
    case 'POST':   return 'CREATE';
    case 'PUT':
    case 'PATCH':  return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default:       return method;
  }
}

// Extract entity name from URL path segment (e.g. /api/v1/risks/123 → "risks")
function extractEntity(url: string): string {
  // Strip query string
  const path = url.split('?')[0];
  // Strip leading /api/v1/ prefix if present
  const stripped = path.replace(/^\/api\/v\d+\//, '/');
  // First meaningful path segment
  const segments = stripped.split('/').filter(Boolean);
  return segments[0] ?? 'unknown';
}

// Extract entityId from URL params or from the response body
function extractEntityId(req: Request, responseBody: any): string | undefined {
  // Prefer :id param from the URL
  const params = (req as any).params;
  if (params?.id) return params.id;

  // Fallback: id from response body (e.g. after POST create)
  if (responseBody && typeof responseBody === 'object') {
    return responseBody.id ?? responseBody.data?.id;
  }

  return undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    // Only audit mutating operations
    if (!WRITE_METHODS.has(method)) return next.handle();

    // Skip auth and health routes
    if (SKIP_PATHS.some((p) => url.includes(p))) return next.handle();

    return next.handle().pipe(
      tap((responseBody) => {
        // Fire-and-forget — never blocks the response
        this.writeAuditLog(request, method, url, responseBody).catch((err) => {
          this.logger.warn(`AuditInterceptor failed to write log: ${err?.message}`);
        });
      }),
    );
  }

  private async writeAuditLog(
    req: Request,
    method: string,
    url: string,
    responseBody: any,
  ): Promise<void> {
    const user = (req as any).user;
    const userId: string | undefined = user?.id;
    const organizationId: string | undefined = user?.organizationId;

    const ipAddress =
      ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) ??
      req.ip ??
      null;
    const userAgent = (req.headers['user-agent'] as string) ?? null;

    const action = methodToAction(method);
    const entity = extractEntity(url);
    const entityId = extractEntityId(req, responseBody);

    await this.prisma.auditLog.create({
      data: {
        organizationId: organizationId ?? null,
        userId: userId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        ipAddress,
        userAgent,
        metadata: {
          method,
          url,
        },
      },
    });
  }
}
