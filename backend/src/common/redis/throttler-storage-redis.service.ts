import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

// Redis-backed ThrottlerStorage so rate limits (and block state) are shared
// across backend instances/containers, instead of each instance tracking
// hits in its own process memory (the default @nestjs/throttler behavior).
//
// @nestjs/throttler v6 added block-duration support: once a key exceeds its
// limit, it's marked blocked for `blockDuration` regardless of further hits,
// instead of just rolling off after `ttl`. We track that as a separate Redis
// key with its own TTL rather than an in-process timer, which is actually
// more correct than the library's own in-memory reference implementation
// once you have more than one backend instance.
@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttler:${throttlerName}:${key}`;
    const blockKey = `${hitKey}:blocked`;

    const blockPttl = await this.redis.pttl(blockKey);
    if (blockPttl > 0) {
      const totalHits = Number(await this.redis.get(hitKey)) || 0;
      const hitPttl = await this.redis.pttl(hitKey);
      return {
        totalHits,
        timeToExpire: Math.ceil((hitPttl > 0 ? hitPttl : ttl) / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockPttl / 1000),
      };
    }

    const totalHits = await this.redis.incr(hitKey);
    if (totalHits === 1) {
      await this.redis.pexpire(hitKey, ttl);
    }
    const hitPttl = await this.redis.pttl(hitKey);
    const timeToExpire = Math.ceil((hitPttl > 0 ? hitPttl : ttl) / 1000);

    let isBlocked = false;
    let timeToBlockExpire = 0;
    if (totalHits > limit) {
      isBlocked = true;
      const effectiveBlockDuration = blockDuration > 0 ? blockDuration : ttl;
      await this.redis.set(blockKey, '1', 'PX', effectiveBlockDuration);
      timeToBlockExpire = Math.ceil(effectiveBlockDuration / 1000);
    }

    return { totalHits, timeToExpire, isBlocked, timeToBlockExpire };
  }
}
