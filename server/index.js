require('dotenv').config();

const DEFAULT_PORT = 8080;

function resolvePort() {
  const raw = process.env.PORT;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  console.warn(`[startup] PORT is missing or invalid (${raw}); defaulting to ${DEFAULT_PORT}`);
  return DEFAULT_PORT;
}

/**
 * Load secrets. Failures propagate — bootstrap must not listen afterward.
 */
async function loadSecretsRequired() {
  const { loadSecrets } = require('./config/loadSecrets');
  await loadSecrets();
  console.log('[startup] Secrets load complete');
}

async function startHealthListener(app, port) {
  return new Promise((resolve, reject) => {
    let server;

    server = app.listen(port, '0.0.0.0', () => {
      console.log(`[startup] Listening on 0.0.0.0:${port} (GET /healthz ready)`);
      resolve(server);
    });

    server.on('error', (error) => {
      console.error(`[startup] Failed to bind 0.0.0.0:${port}:`, error);
      reject(error);
    });
  });
}

/**
 * Build the Express app without listening.
 * Used by focused HTTP hardening tests (after env is already configured).
 *
 * Middleware order (after createApp):
 * 1. trust proxy
 * 2. GET /healthz
 * 3. host validation (opt-in via ALLOWED_HOSTS; /healthz already matched)
 * 4. requestLogger
 * 5. cors
 * 6. cookieParser
 * 7. csrfProtection
 * 8. express.json
 * 9. routes: /, /csrf-token, /auth, /admin, /employee, /aba
 * 10. notFoundHandler
 * 11. errorHandler
 */
function createApp() {
  const express = require('express');
  const { configureTrustProxy } = require('./middleware/trustProxy');
  const { registerHealthRoutes } = require('./routes/health');

  const app = express();
  app.disable('x-powered-by');
  configureTrustProxy(app);
  registerHealthRoutes(app);
  registerApplicationRoutes(app);
  return app;
}

function registerApplicationRoutes(app) {
  const port = resolvePort();
  const prodStatus = process.env.IN_PROD === 'true';
  const clientOrigin = process.env.ClientHost;
  const amplifyOrigin = process.env.AmplifyHost;
  const cors = require('cors');
  const cookieParser = require('cookie-parser');
  const { createAuthMiddleware } = require('./middleware/authMiddleware');
  const { createRouterRouteMatcher } = require('./middleware/routerRouteMatcher');
  const requestLogger = require('./middleware/requestLogger');
  const { generalLimiter, apiLimiter } = require('./middleware/rateLimiter');
  const { csrfProtection, generateToken } = require('./middleware/csrfProtection');
  const { createHostValidationMiddleware } = require('./middleware/hostValidation');
  const { notFoundHandler } = require('./middleware/notFoundHandler');
  const { errorHandler } = require('./middleware/errorHandler');
  const host = process.env.HOST;
  const hostPort = port ? `:${port}` : '';
  const prodHost = prodStatus ? host : `${host}${hostPort}`;

  const allowedOrigins = [clientOrigin, amplifyOrigin].filter(Boolean);

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
        const err = new Error('Not allowed by CORS');
        err.status = 403;
        callback(err);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  };

  app.use(createHostValidationMiddleware());
  app.use(requestLogger);
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use(expressJsonMiddleware());

  app.get('/', generalLimiter, (req, res) => {
    if (prodStatus) {
      return res.send(`The server is running successfully. <br/>The server url is ${prodHost}...`);
    }

    return res.send(
      `The server is running successfully. <br/>The server is running on port ${port}... <br/>The server url is ${prodHost}...`,
    );
  });

  app.get('/csrf-token', generalLimiter, (req, res) => {
    res.json({ csrfToken: generateToken(req, res) });
  });

  const authRoute = require('./routes/Auth');
  app.use('/auth', authRoute);

  const adminRoute = require('./routes/Admin');
  app.use(
    '/admin',
    apiLimiter,
    createAuthMiddleware({ isKnownRoute: createRouterRouteMatcher(adminRoute) }),
    adminRoute,
  );

  const employeeRoute = require('./routes/Employee');
  app.use(
    '/employee',
    apiLimiter,
    createAuthMiddleware({ isKnownRoute: createRouterRouteMatcher(employeeRoute) }),
    employeeRoute,
  );

  const abaRoute = require('./routes/ABA');
  app.use(
    '/aba',
    apiLimiter,
    createAuthMiddleware({ isKnownRoute: createRouterRouteMatcher(abaRoute) }),
    abaRoute,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  console.log('[startup] Application routes registered');
}

function expressJsonMiddleware() {
  const express = require('express');
  return express.json({
    limit: '1mb',
  });
}

async function initializeDatabase() {
  const { testConnection, syncDatabase } = require('./models');

  try {
    await testConnection();
    await syncDatabase();
    console.log(`[startup] Database ready: ${process.env.MYSQL_DATABASE} at ${process.env.MYSQL_HOST}`);
  } catch (error) {
    console.error('[startup] Database initialization failed (healthz remains available):', error);
  }
}

/**
 * Production startup order (exact):
 * 1. dotenv (module load) + AWS Secrets Manager
 * 2. Validate production DB host (and refuse loopback in production)
 * 3. Create Express app (modules that read env / open DB pool load here)
 * 4. Configure trust proxy, register /healthz + application middleware/routes
 * 5. app.listen()
 * 6. Graceful shutdown hooks; async DB connectivity check/sync (optional post-listen work)
 *
 * Traffic is not accepted until secrets + production validation succeed.
 */
async function bootstrap() {
  console.log('[startup] BMetrics API bootstrap beginning');
  console.log(
    '[startup] node=%s env=%s port=%s cwd=%s',
    process.version,
    process.env.NODE_ENV ?? '(unset)',
    process.env.PORT ?? '(unset)',
    process.cwd(),
  );

  const isTest = process.env.NODE_ENV === 'test';

  if (!isTest) {
    const { registerProcessGuards } = require('./lib/processGuards');
    registerProcessGuards();
  }

  await loadSecretsRequired();

  const { assertProductionDbHost } = require('./config/assertProductionDbHost');
  assertProductionDbHost();
  console.log('[startup] Production configuration validated');

  const port = resolvePort();
  const express = require('express');
  const { configureTrustProxy } = require('./middleware/trustProxy');
  const { registerHealthRoutes } = require('./routes/health');

  const app = express();
  app.disable('x-powered-by');
  configureTrustProxy(app);

  registerHealthRoutes(app);
  console.log('[startup] Registered GET /healthz');

  registerApplicationRoutes(app);

  console.log(`[startup] Environment: ${process.env.NODE_ENV ?? '(unset)'}`);

  const server = await startHealthListener(app, port);

  if (!isTest) {
    const { registerGracefulShutdown } = require('./lib/gracefulShutdown');
    registerGracefulShutdown({
      server,
      getSequelize: () => {
        try {
          return require('./config/database');
        } catch {
          return null;
        }
      },
    });
  }

  void initializeDatabase();

  return { app, server };
}

if (process.env.SKIP_SERVER_BOOTSTRAP !== 'true') {
  bootstrap().catch((error) => {
    console.error('[startup] Fatal bootstrap error:', error);
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
  createApp,
  registerApplicationRoutes,
  resolvePort,
  expressJsonMiddleware,
  initializeDatabase,
  loadSecretsRequired,
  DEFAULT_PORT,
};
