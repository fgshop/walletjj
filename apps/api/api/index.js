const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');

const server = express();
let bootstrapPromise = null;

async function bootstrap() {
  try {
    const { AppModule } = require('../dist/app.module');
    const { AllExceptionsFilter } = require('../dist/common/filters/all-exceptions.filter');
    const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

    const adapter = new ExpressAdapter(server);
    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log'],
    });

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

    // Swagger UI
    const config = new DocumentBuilder()
      .setTitle('JOJUWallet API')
      .setDescription('TRON TRC-20 Custodial Wallet API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('v1/docs', app, document);

    await app.init();
    console.log('NestJS app initialized for Vercel');
  } catch (err) {
    console.error('Failed to bootstrap NestJS app:', err);
    // Fallback: respond with error on all requests
    server.use((req, res) => {
      res.status(500).json({
        success: false,
        error: {
          code: 'BOOTSTRAP_FAILED',
          message: err.message || 'Server initialization failed',
        },
      });
    });
  }
}

// Start bootstrap immediately (not lazily)
bootstrapPromise = bootstrap();

module.exports = async (req, res) => {
  await bootstrapPromise;
  server(req, res);
};
