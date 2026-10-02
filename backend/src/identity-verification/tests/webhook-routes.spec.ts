import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { IdentityVerificationController } from '../identity-verification.controller';
import { LicensingController } from '../../licensing/licensing.controller';

// The platform has a GLOBAL login guard: a webhook route is reachable by the provider only if it is
// marked @Public() (an empty @UseGuards() does not bypass it — the webhooks used to answer 401).
// They stay safe because each one verifies the provider's signature over the raw body itself.
describe('webhook routes bypass the global login guard', () => {
  const isPublic = (target: object) => Reflect.getMetadata(IS_PUBLIC_KEY, target) === true;

  it('identity-verification provider webhooks', () => {
    expect(isPublic(IdentityVerificationController.prototype.handleWebhook)).toBe(true);
  });

  it('Stripe webhook', () => {
    expect(isPublic(LicensingController.prototype.stripeWebhook)).toBe(true);
  });

  it('but nothing else in those controllers is public', () => {
    for (const [ctrl, name] of [
      [IdentityVerificationController, 'handleWebhook'], [LicensingController, 'stripeWebhook'],
    ] as const) {
      const others = Object.getOwnPropertyNames(ctrl.prototype).filter(n => n !== 'constructor' && n !== name);
      for (const n of others) expect(isPublic((ctrl.prototype as any)[n])).toBe(false);
    }
  });
});
