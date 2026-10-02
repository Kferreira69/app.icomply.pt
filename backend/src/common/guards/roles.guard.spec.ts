import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, supportMayCall } from './roles.guard';

const ctx = (user: any, url: string): any => ({
  getHandler: () => () => undefined,
  getClass: () => class {},
  switchToHttp: () => ({ getRequest: () => ({ user, originalUrl: url }) }),
});

describe('SUPPORT role is limited to the support desk', () => {
  it('may call the support desk and what the app shell needs', () => {
    for (const u of [
      '/api/v1/support-tickets', '/api/v1/support-tickets/abc/replies', '/api/v1/support-tickets?status=OPEN',
      '/api/v1/auth/me', '/api/v1/auth/refresh', '/api/v1/permissions/my', '/api/v1/notifications',
      '/api/v1/users/me/change-password', '/api/v1/licensing/my/feature-flags',
    ]) expect(supportMayCall(u)).toBe(true);
  });

  it('may not call anything else — including routes with no @RequireModule', () => {
    for (const u of [
      '/api/v1/projects', '/api/v1/risks', '/api/v1/users', '/api/v1/users/abc', '/api/v1/licensing/clients',
      '/api/v1/identity-verification', '/api/v1/quality-documents', '/api/v1/search?q=x', '/api/v1/support-ticketsX',
      '/api/v1/backoffice/leads', '/api/v1/auth-evil',
    ]) expect(supportMayCall(u)).toBe(false);
  });

  it('the guard refuses a SUPPORT user outside the allowlist and lets everybody else through', () => {
    const guard = new RolesGuard(new Reflector());
    expect(() => guard.canActivate(ctx({ role: 'SUPPORT' }, '/api/v1/projects'))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({ role: 'SUPPORT' }, '/api/v1/support-tickets'))).toBe(true);
    expect(guard.canActivate(ctx({ role: 'VIEWER' }, '/api/v1/projects'))).toBe(true);
    expect(guard.canActivate(ctx({ role: 'ADMIN' }, '/api/v1/risks'))).toBe(true);
  });
});
