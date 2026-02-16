import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { WITHDRAWAL_QUEUE, NOTIFICATION_QUEUE } from './queue.constants';

const logger = new Logger('QueueModule');
let redisErrorLogged = false;

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            lazyConnect: true,
            retryStrategy(times: number) {
              if (times > 3) {
                if (!redisErrorLogged) {
                  logger.warn(
                    'Redis not available. BullMQ queues disabled. Withdrawal 24h timer and execution jobs will not run.',
                  );
                  redisErrorLogged = true;
                }
                return null;
              }
              return Math.min(times * 500, 3000);
            },
            reconnectOnError() {
              return false;
            },
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: WITHDRAWAL_QUEUE },
      { name: NOTIFICATION_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
