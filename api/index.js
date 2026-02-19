const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const express = require('express');

let cachedServer;

async function bootstrap() {
  const server = express();
  const { AppModule } = require('../apps/api/dist/app.module');
  const { AllExceptionsFilter } = require('../apps/api/dist/common/filters/all-exceptions.filter');
  const { TransformInterceptor } = require('../apps/api/dist/common/interceptors/transform.interceptor');

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
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

  await app.init();
  return server;
}

module.exports = async (req, res) => {
  if (!cachedServer) {
    cachedServer = bootstrap();
  }
  const server = await cachedServer;
  server(req, res);
};
