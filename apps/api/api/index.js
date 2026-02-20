let app;
let initError;

async function bootstrap() {
  try {
    const { NestFactory } = require('@nestjs/core');
    const { ValidationPipe } = require('@nestjs/common');
    const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
    const { AppModule } = require('../dist/app.module');
    const { AllExceptionsFilter } = require('../dist/common/filters/all-exceptions.filter');
    const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

    const nestApp = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    nestApp.setGlobalPrefix('v1');

    nestApp.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3100',
        /\.vercel\.app$/,
      ],
      credentials: true,
    });

    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    nestApp.useGlobalFilters(new AllExceptionsFilter());
    nestApp.useGlobalInterceptors(new TransformInterceptor());

    const config = new DocumentBuilder()
      .setTitle('JOJUWallet API')
      .setDescription('TRON TRC-20 Custodial Wallet API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(nestApp, config);
    SwaggerModule.setup('v1/docs', nestApp, document);

    await nestApp.init();
    app = nestApp.getHttpAdapter().getInstance();
    console.log('NestJS app initialized for Vercel');
  } catch (e) {
    initError = e;
    console.error('Bootstrap failed:', e);
  }
}

const ready = bootstrap();

module.exports = async (req, res) => {
  await ready;
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'BOOTSTRAP_FAILED',
        message: initError.message || 'Server initialization failed',
        stack: process.env.NODE_ENV !== 'production' ? initError.stack : undefined,
      },
    }));
    return;
  }
  app(req, res);
};
