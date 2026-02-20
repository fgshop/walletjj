// ── Crash guard: catch ALL unhandled errors to prevent FUNCTION_INVOCATION_FAILED ──
process.on('unhandledRejection', (reason) => {
  console.error('[Vercel] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Vercel] Uncaught Exception:', err);
});

// ── Help @vercel/nft trace the Prisma generated client ──
// This static require path ensures the bundler includes the Prisma query engine
try {
  require('../node_modules/.prisma/client');
} catch (_) {
  // OK if this fails at require time — the app will load it through @prisma/client
}

// ── CORS config ──
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3100',
];

function isAllowedOrigin(origin) {
  if (!origin) return true; // Allow non-browser requests (curl, Postman)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/\.vercel\.app$/.test(origin)) return true;
  return false;
}

function setCorsHeaders(req, res) {
  const origin = req.headers['origin'] || req.headers['Origin'] || '';
  if (isAllowedOrigin(origin)) {
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
    console.log('[Vercel] Bootstrap starting...');

    // Pre-flight: verify critical paths exist
    const fs = require('fs');
    const path = require('path');
    const distPath = path.join(__dirname, '..', 'dist', 'app.module.js');
    const prismaPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.js');
    console.log('[Vercel] dist/app.module.js exists:', fs.existsSync(distPath));
    console.log('[Vercel] .prisma/client exists:', fs.existsSync(prismaPath));

    const { NestFactory } = require('@nestjs/core');
    const { ValidationPipe } = require('@nestjs/common');
    const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
    const { AppModule } = require('../dist/app.module');
    const { AllExceptionsFilter } = require('../dist/common/filters/all-exceptions.filter');
    const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

    console.log('[Vercel] Modules loaded, creating NestJS app...');

    const nestApp = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    nestApp.setGlobalPrefix('v1');

    nestApp.enableCors({
      origin: function (origin, callback) {
        if (isAllowedOrigin(origin)) {
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
    console.log('[Vercel] NestJS app initialized successfully');
  } catch (e) {
    initError = e;
    console.error('[Vercel] Bootstrap FAILED:', e.message, e.stack);
  }
}

const ready = bootstrap();

module.exports = async (req, res) => {
  // ── Handle CORS preflight immediately (before waiting for NestJS) ──
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
