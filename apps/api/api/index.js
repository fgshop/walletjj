const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/app.module');
const { AllExceptionsFilter } = require('../dist/common/filters/all-exceptions.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

let app;

module.exports = async (req, res) => {
  if (!app) {
    const nestApp = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

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

    await nestApp.init();
    app = nestApp.getHttpAdapter().getInstance();
  }

  app(req, res);
};
