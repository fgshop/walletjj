// ── Fix .prisma/client resolution for pnpm on Vercel ──
// pnpm hoists @prisma/client into .pnpm virtual store. When it requires
// '.prisma/client', it finds the uninitialized default instead of our
// generated client. This patch redirects the resolution.
const path = require('path');
const Module = require('module');
const _generatedPrismaDir = path.resolve(__dirname, '..', 'apps', 'api', 'node_modules', '.prisma', 'client');
const _origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '.prisma/client' || request === '.prisma/client/default') {
    const target = request === '.prisma/client/default'
      ? path.join(_generatedPrismaDir, 'default.js')
      : path.join(_generatedPrismaDir, 'index.js');
    return target;
  }
  return _origResolve.apply(this, arguments);
};

// ── Crash guard ──
process.on('unhandledRejection', (reason) => {
  if (reason && (reason.code === 'ECONNREFUSED' || (reason.message && reason.message.includes('Connection is closed')))) {
    return;
  }
  console.error('[Vercel] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  if (err && (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('Connection is closed')))) {
    return;
  }
  console.error('[Vercel] Uncaught Exception:', err);
});

// ── Help @vercel/nft trace Prisma + shared packages + ESM-only packages ──
try { require('../apps/api/node_modules/.prisma/client'); } catch (_) {}
try { require('@joju/types'); } catch (_) {}
try { require('@joju/utils'); } catch (_) {}
import('@scure/bip32').catch(() => {});
import('@scure/bip39').catch(() => {});
import('@scure/bip39/wordlists/english.js').catch(() => {});

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

// ── Bootstrap ──
const express = require('express');

let cachedServer;

async function bootstrap() {
  const server = express();
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const { AppModule } = require('../apps/api/dist/app.module');
  const { AllExceptionsFilter } = require('../apps/api/dist/common/filters/all-exceptions.filter');
  const { TransformInterceptor } = require('../apps/api/dist/common/interceptors/transform.interceptor');

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('v1');

  app.enableCors({
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

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  console.log('[Vercel] NestJS app initialized successfully');
  return server;
}

module.exports = async (req, res) => {
  // Handle CORS preflight immediately
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (!cachedServer) {
      cachedServer = bootstrap();
    }
    const server = await cachedServer;
    server(req, res);
  } catch (error) {
    console.error('[Vercel] Bootstrap error:', error);
    cachedServer = null;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'BOOTSTRAP_FAILED',
        message: error.message || 'Server initialization failed',
      },
    }));
  }
};
