/**
 * Token Blacklist Service — Redis-backed
 *
 * Revoked JWTs are stored in Redis with a TTL matching the token's remaining
 * lifetime. This guarantees:
 *   - Blacklist survives server restarts
 *   - Works correctly in multi-instance / horizontal-scaling scenarios
 *   - No memory leak (Redis expires keys automatically)
 *
 * Key format:  bl:{jti}
 * Value:       "1"  (just a marker — the TTL carries the logic)
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Revoke a token by its JTI claim.
   * @param jti     — unique JWT ID (jti claim)
   * @param ttlSeconds — seconds until the token would have expired naturally
   */
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return; // already expired — nothing to do
    await this.redis.set(`bl:${jti}`, '1', 'EX', ttlSeconds);
    this.logger.debug(`Token revoked: ${jti} (TTL ${ttlSeconds}s)`);
  }

  /** Returns true when the token has been explicitly revoked. */
  async isRevoked(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`bl:${jti}`);
    return exists === 1;
  }
}
