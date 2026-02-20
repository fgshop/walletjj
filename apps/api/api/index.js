// ── Crash guard ──
process.on('unhandledRejection', (reason) => {
  console.error('[Vercel] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Vercel] Uncaught Exception:', err);
});

// ── Help @vercel/nft trace the Prisma generated client ──
try {
  require('../node_modules/.prisma/client');
} catch (_) {}

// ── CORS ──
function setCorsHeaders(req, res) {
  const origin = req.headers['origin'] || '';
  if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

let app;
let initError;

async function bootstrap() {
  try {
    const { NestFactory } = require('@nestjs/core');
    const { ValidationPipe } = require('@nestjs/common');
    const { AppModule } = require('../dist/app.module');
    const { AllExceptionsFilter } = require('../dist/common/filters/all-exceptions.filter');
    const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

    const nestApp = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    nestApp.setGlobalPrefix('v1');

    nestApp.enableCors({
      origin: function (origin, callback) {
        if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    });

    nestApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    nestApp.useGlobalFilters(new AllExceptionsFilter());
    nestApp.useGlobalInterceptors(new TransformInterceptor());

    await nestApp.init();
    app = nestApp.getHttpAdapter().getInstance();
    console.log('[Vercel] NestJS app initialized successfully');
  } catch (e) {
    initError = e;
    console.error('[Vercel] Bootstrap FAILED:', e.message, e.stack);
  }
}

const ready = bootstrap();

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    await ready;
    if (initError) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'BOOTSTRAP_FAILED',
          message: initError.message || 'Server initialization failed',
        },
      }));
      return;
    }
    app(req, res);
  } catch (handlerError) {
    console.error('[Vercel] Handler error:', handlerError);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'HANDLER_ERROR',
        message: handlerError.message || 'Unknown handler error',
      },
    }));
  }
};
