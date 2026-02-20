import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Suppress Redis ECONNREFUSED noise from BullMQ/ioredis when Redis is unavailable.
// These errors are emitted on stderr via multiple paths (uncaught exceptions,
// unhandled rejections, and raw ioredis error events). We catch all three.
const startupLogger = new Logger('Bootstrap');
let redisWarnLogged = false;

function isRedisConnError(val: any): boolean {
  if (!val) return false;
  if (val.code === 'ECONNREFUSED') return true;
  if (val.name === 'AggregateError' && val.errors?.some?.((e: any) => e?.code === 'ECONNREFUSED')) return true;
  if (typeof val.message === 'string' && val.message.includes('Connection is closed')) return true;
  return false;
}

function logRedisWarnOnce() {
  if (!redisWarnLogged) {
    startupLogger.warn('Redis connection refused — running without Redis.');
    redisWarnLogged = true;
  }
}

process.on('unhandledRejection', (reason: any) => {
  if (isRedisConnError(reason)) { logRedisWarnOnce(); return; }
  startupLogger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err: any) => {
  if (isRedisConnError(err)) { logRedisWarnOnce(); return; }
  startupLogger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Filter Redis error stack traces that ioredis writes directly to stderr
const origStderrWrite = process.stderr.write.bind(process.stderr);
(process.stderr as any).write = (chunk: any, ...args: any[]): boolean => {
  const str = typeof chunk === 'string' ? chunk : chunk.toString();
  if (
    (str.includes('ECONNREFUSED') && str.includes('6379')) ||
    (str.includes('Connection is closed') && str.includes('ioredis'))
  ) {
    return true;
  }
  return origStderrWrite(chunk, ...args);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3100',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('JOJUWallet API')
    .setDescription('TRON TRC-20 Custodial Wallet API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`JOJUWallet API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
