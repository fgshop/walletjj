// ── DIAGNOSTIC: Ultra-minimal function to debug FUNCTION_INVOCATION_FAILED ──

// Step 1: Crash guard
const errors = [];
process.on('unhandledRejection', (reason) => {
  errors.push({ type: 'unhandledRejection', message: String(reason), stack: reason?.stack });
  console.error('[Vercel] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  errors.push({ type: 'uncaughtException', message: String(err), stack: err?.stack });
  console.error('[Vercel] Uncaught Exception:', err);
});

// Step 2: Check what files exist
const fs = require('fs');
const path = require('path');

function checkPaths() {
  const checks = {};
  const base = path.join(__dirname, '..');
  const paths = [
    'dist/app.module.js',
    'dist/main.js',
    'node_modules/.prisma/client/index.js',
    'node_modules/@prisma/client/index.js',
    'node_modules/@nestjs/core/index.js',
    'node_modules/@nestjs/common/index.js',
  ];
  for (const p of paths) {
    checks[p] = fs.existsSync(path.join(base, p));
  }
  checks['__dirname'] = __dirname;
  checks['parentDir'] = base;
  try {
    checks['parentDirContents'] = fs.readdirSync(base).slice(0, 20);
  } catch (e) {
    checks['parentDirContents'] = 'ERROR: ' + e.message;
  }
  try {
    checks['distContents'] = fs.readdirSync(path.join(base, 'dist')).slice(0, 20);
  } catch (e) {
    checks['distContents'] = 'ERROR: ' + e.message;
  }
  return checks;
}

// Step 3: Try loading Prisma (in try-catch)
let prismaLoadResult = 'not attempted';
try {
  require('../node_modules/.prisma/client');
  prismaLoadResult = 'OK';
} catch (e) {
  prismaLoadResult = 'FAILED: ' + e.message;
}

// Step 4: Try loading NestJS modules
let nestLoadResult = 'not attempted';
try {
  require('@nestjs/core');
  require('@nestjs/common');
  nestLoadResult = 'OK';
} catch (e) {
  nestLoadResult = 'FAILED: ' + e.message;
}

// Step 5: Try loading our dist modules
let distLoadResult = 'not attempted';
try {
  require('../dist/app.module');
  distLoadResult = 'OK';
} catch (e) {
  distLoadResult = 'FAILED: ' + e.message;
}

// Step 6: CORS helper
function setCorsHeaders(req, res) {
  const origin = req.headers['origin'] || '';
  if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Step 7: Try NestJS bootstrap (async)
let app;
let initError;
let bootstrapStatus = 'pending';

async function bootstrap() {
  // Only attempt full bootstrap if all modules loaded OK
  if (distLoadResult !== 'OK') {
    initError = new Error('Skipped bootstrap: dist modules failed to load - ' + distLoadResult);
    bootstrapStatus = 'skipped';
    return;
  }

  try {
    bootstrapStatus = 'starting';
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

    // Skip Swagger on Vercel to reduce cold start time
    await nestApp.init();
    app = nestApp.getHttpAdapter().getInstance();
    bootstrapStatus = 'ready';
    console.log('[Vercel] NestJS app initialized successfully');
  } catch (e) {
    initError = e;
    bootstrapStatus = 'failed';
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

  // Diagnostic endpoint
  if (req.url === '/v1/debug' || req.url === '/debug') {
    const envKeys = Object.keys(process.env).filter(k =>
      ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'VERCEL', 'VERCEL_ENV'].includes(k)
    );
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'function_alive',
      bootstrapStatus,
      prismaLoadResult,
      nestLoadResult,
      distLoadResult,
      envVarsPresent: envKeys.reduce((acc, k) => {
        acc[k] = process.env[k] ? 'SET (' + process.env[k].substring(0, 5) + '...)' : 'NOT SET';
        return acc;
      }, {}),
      paths: checkPaths(),
      errors: errors.slice(-5),
      initError: initError ? { message: initError.message, stack: initError.stack?.split('\n').slice(0, 5) } : null,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    }, null, 2));
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
