import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { prisma } from './db';
import { articlesRouter } from './articles/routes';
import { authRouter } from './auth/routes';
import { adminRouter } from './admin/routes';
import { callsRouter } from './calls/routes';
import { communityRouter } from './community/routes';
import { discoveryRouter } from './discovery/routes';
import { messagingRouter } from './messaging/routes';
import { mediaRouter } from './media/routes';
import { notificationsRouter } from './notifications/routes';
import { profileRouter } from './profile/routes';
import { waliRouter } from './wali/routes';
import { walletRouter } from './wallet/routes';
import { paymentsRouter } from './wallet/webhooks';
import { errorHandler, notFoundHandler, requestMeta } from './http/envelope';
import { plansRouter } from './plans/routes';
import { cleanupExpiredSessions } from './auth/session';
import { cleanupOtpCodes } from './auth/otp';
import { cleanupRateLimits } from './security/rateLimit';
import { metricsText, recordRequest } from './observability';

export const app = express();

type RawRequest = express.Request & { rawBody?: Buffer };

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

// رؤوس أمان افتراضية. الخدمة تُرجع JSON فقط، لذلك CSP الافتراضي كافٍ.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
);

app.use(
  cors({
    origin: config.webOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  }),
);

// نحتفظ بالجسم الخام للتحقق من توقيع webhooks (Stripe يحتاج البايتات الأصلية).
app.use(
  express.json({
    limit: '256kb',
    verify: (req, _res, buffer) => {
      (req as RawRequest).rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(cookieParser());

function hasAuthCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return (
    cookieHeader.includes(`${config.session.cookieName}=`) ||
    cookieHeader.includes(`${config.admin.cookieName}=`)
  );
}

// حماية CSRF: نرفض أي أصل غير مسموح، ونمنع طلبات التغيير الحاملة لكوكي
// جلسة بدون Origin في الإنتاج. الـ webhooks لا تحمل كوكي جلسة.
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin && !config.webOrigins.includes(origin)) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'أصل الطلب غير مسموح' },
      meta: requestMeta(res),
    });
    return;
  }

  if (
    config.isProduction &&
    !origin &&
    hasAuthCookie(req.headers.cookie) &&
    req.headers['sec-fetch-site'] !== 'same-origin'
  ) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'طلب غير موثوق — أعد تحميل الصفحة' },
      meta: requestMeta(res),
    });
    return;
  }

  next();
});

// معرّف طلب موحّد في كل استجابة — نفس عقد الموبايل.
app.use((req, res, next) => {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// سجل طلبات منظّم + مقاييس Prometheus.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const route =
      (req.route?.path as string | undefined) ??
      (req.baseUrl ? `${req.baseUrl}${req.path}` : req.path);
    recordRequest({
      method: req.method,
      route: route || '/',
      status: res.statusCode,
      durationMs,
    });

    if (req.path === '/health' || req.path === '/api/health') return;
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'request',
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
        ip: req.ip,
      }),
    );
  });
  next();
});

async function healthHandler(_req: express.Request, res: express.Response): Promise<void> {
  let database: 'ok' | 'down' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }

  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: 'sharik-web-bff',
    database,
    time: new Date().toISOString(),
  });
}

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

function isLoopback(ip: string | undefined): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

app.get('/metrics', (req, res) => {
  if (config.metricsToken) {
    const header = req.headers.authorization ?? '';
    if (header !== `Bearer ${config.metricsToken}`) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'مطلوب توكن المقاييس' },
        meta: requestMeta(res),
      });
      return;
    }
  } else if (config.isProduction && !isLoopback(req.ip)) {
    res.status(404).end();
    return;
  }

  res.type('text/plain; version=0.0.4').send(metricsText());
});

app.get('/', (_req, res) => {
  res.json({
    service: 'sharik-web-bff',
    version: '1.0.0',
    docs: {
      health: '/health',
      metrics: '/metrics',
      auth: '/api/auth',
      profile: '/api/profile',
      admin: '/api/admin',
      plans: '/api/subscriptions/plans',
      articles: '/api/blog/articles',
    },
  });
});

// المصادقة والملف الشخصي
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);

// المنتج
app.use('/api/messages', messagingRouter);
app.use('/api', mediaRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/community', communityRouter);
app.use('/api/wali', waliRouter);
app.use('/api/calls', callsRouter);

// الإدارة والدفع
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);

// المحتوى العام + الاكتشاف (آخر شيء حتى لا يحجب المسارات الأكثر تحديدًا)
app.use('/api', plansRouter);
app.use('/api', articlesRouter);
// Discovery has its own namespace so that `/api/discovery/profile/:id`
// cannot collide with the authenticated profile router at `/api/profile`.
app.use('/api/discovery', discoveryRouter);
// Backwards-compatible aliases for clients that used the flat routes.
app.use('/api', discoveryRouter);

app.use(notFoundHandler);
app.use(errorHandler);

let maintenanceTimer: NodeJS.Timeout | null = null;

async function runMaintenance(): Promise<void> {
  const [sessions, otpCodes, rateLimits] = await Promise.all([
    cleanupExpiredSessions(),
    cleanupOtpCodes(),
    cleanupRateLimits(),
  ]);
  console.info(
    JSON.stringify({
      level: 'info',
      msg: 'maintenance',
      cleanedSessions: sessions,
      cleanedOtpCodes: otpCodes,
      cleanedRateLimits: rateLimits,
    }),
  );
}

function scheduleMaintenance(): void {
  const run = () => {
    void runMaintenance().catch((error) => {
      console.error('[bff] maintenance failed', error);
    });
  };
  run();
  maintenanceTimer = setInterval(run, 15 * 60 * 1000);
  maintenanceTimer.unref();
}

async function start(): Promise<void> {
  await prisma.$connect();
  scheduleMaintenance();

  const server = app.listen(config.port, config.host, () => {
    console.info(`[bff] sharik-web-bff listening on http://${config.host}:${config.port}`);
    console.info(
      `[bff] environment=${config.env} otp=${config.otp.smsProvider} devEcho=${config.otp.devEcho} payments=${config.payments.provider}`,
    );
  });

  const shutdown = (signal: string) => {
    console.info(`[bff] ${signal} received — shutting down`);
    if (maintenanceTimer) clearInterval(maintenanceTimer);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[bff] unhandled rejection', reason);
});

if (require.main === module) {
  void start().catch((error) => {
    console.error('[bff] failed to start', error);
    process.exit(1);
  });
}
