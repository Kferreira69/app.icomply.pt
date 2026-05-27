/**
 * Token Blacklist Service
 *
 * Keeps a set of revoked JWTs until they naturally expire.
 * Currently in-memory — swap the backing store for Redis in production:
 *
 *   await this.redis.set(`bl:${jti}`, '1', 'EX', ttlSeconds);
 *   return !!(await this.redis.exists(`bl:${jti}`));
 */
import { Injectable, Logger } from '@nestjs/common';

interface BlacklistEntry {
  expiresAt: number; // Unix ms
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly store = new Map<string, BlacklistEntry>();

  /** Revoke a token for `ttlSeconds` (should equal the JWT's remaining lifetime). */
  revoke(jti: string, ttlSeconds: number): void {
    this.store.set(jti, { expiresAt: Date.now() + ttlSeconds * 1000 });
    this.logger.debug(`Token revoked: ${jti} (TTL ${ttlSeconds}s)`);
    this.prune();
  }

  /** Returns true when the token has been explicitly revoked. */
  isRevoked(jti: string): boolean {
    const entry = this.store.get(jti);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(jti);
      return false;
    }
    return true;
  }

  /** Remove expired entries to prevent memory growth. */
  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}
