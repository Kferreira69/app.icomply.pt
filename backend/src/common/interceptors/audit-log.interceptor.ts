import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    const action = this.mapMethodToAction(method);
    const entity = this.extractEntity(url);

    return next.handle().pipe(
      tap(async (responseData) => {
        if (!user || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          return;
        }

        try {
          await this.prisma.auditLog.create({
            data: {
              organizationId: user.organizationId || null,
              userId: user.id,
              action,
              entity,
              entityId: responseData?.id || null,
              newValues: method !== 'DELETE' ? responseData : null,
              ipAddress: ip,
              userAgent: headers['user-agent'],
            },
          });
        } catch {
          // Non-blocking — audit log failures must not break the request
        }
      }),
    );
  }

  private mapMethodToAction(method: string): string {
    const map: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
      GET: 'READ',
    };
    return map[method] || method;
  }

  private extractEntity(url: string): string {
    const segments = url.replace('/api/v1/', '').split('/');
    return segments[0]?.toUpperCase().replace(/-/g, '_') || 'UNKNOWN';
  }
}
