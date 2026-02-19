import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import express, { Request, Response } from 'express';

const server = express();
let isReady = false;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  isReady = true;
}

const readyPromise = bootstrap().catch((err) => {
  new Logger('Vercel').error('Failed to bootstrap NestJS app', err);
});

export default async function handler(req: Request, res: Response) {
  await readyPromise;
  if (!isReady) {
    res.status(500).json({ message: 'Server initialization failed' });
    return;
  }
  server(req, res);
}
