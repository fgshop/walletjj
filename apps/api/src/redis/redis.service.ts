import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private errorLogged = false;

  constructor(private readonly configService: ConfigService) {}

  getClient(): Redis | null {
    // Skip Redis entirely on Vercel serverless
    if (process.env.VERCEL) {
      return null;
    }

    if (!this.client) {
      const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 500, 3000);
        },
        reconnectOnError: () => false,
      });
      this.client.on('error', (err) => {
        if (!this.errorLogged) {
          this.logger.warn(`Redis not available: ${err.message}. Running without cache.`);
          this.errorLogged = true;
        }
      });
      this.client.connect().catch((err) => {
        if (!this.errorLogged) {
          this.logger.warn(`Redis not available: ${err.message}. Running without cache.`);
          this.errorLogged = true;
        }
      });
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      return await client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      if (ttlSeconds) {
        await client.set(key, value, 'EX', ttlSeconds);
      } else {
        await client.set(key, value);
      }
    } catch {
      // Silently fail - cache is optional
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      await client.del(key);
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
