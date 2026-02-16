import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  getClient(): Redis {
    if (!this.client) {
      const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
      });
      this.client.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });
      this.client.connect().catch((err) => {
        this.logger.warn(`Redis not available: ${err.message}. Running without cache.`);
      });
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.getClient().get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.getClient().set(key, value, 'EX', ttlSeconds);
      } else {
        await this.getClient().set(key, value);
      }
    } catch {
      // Silently fail - cache is optional
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.getClient().del(key);
    } catch {
      // Silently fail
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
