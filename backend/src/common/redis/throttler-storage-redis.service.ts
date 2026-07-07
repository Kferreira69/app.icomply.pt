import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

// Redis-backed ThrottlerStorage so rate limits are shared across backend
// instances/containers, instead of each instance tracking hits in its own
// process memory (the default @nestjs/throttler behavior).
@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttler:${key}`;
    const totalHits = await this.redis.incr(redisKey);
    if (totalHits === 1) {
      await this.redis.pexpire(redisKey, ttl);
    }
    const pttl = await this.redis.pttl(redisKey);
    const timeToExpire = Math.ceil((pttl > 0 ? pttl : ttl) / 1000);
    return { totalHits, timeToExpire };
  }
}
