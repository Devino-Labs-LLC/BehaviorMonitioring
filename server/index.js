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

async function loadSecretsSafely() {
  const { loadSecrets } = require('./config/loadSecrets');

  try {
    await loadSecrets();
    console.log('[startup] Secrets load complete');
  } catch (error) {
    console.error('[startup] Secrets load failed (server remains up for /healthz):', error);
  }
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

function registerApplicationRoutes(app) {
  const host = process.env.HOST;
  const port = resolvePort();
  const prodStatus = process.env.IN_PROD === 'true';
  const clientOrigin = process.env.ClientHost;
  const amplifyOrigin = process.env.AmplifyHost;
  const cors = require('cors');
  const cookieParser = require('cookie-parser');
  const authMiddleware = require('./middleware/authMiddleware');
  const requestLogger = require('./middleware/requestLogger');
  const { generalLimiter, apiLimiter } = require('./middleware/rateLimiter');
  const { csrfProtection, generateToken } = require('./middleware/csrfProtection');
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
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  };

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
  app.use('/admin', apiLimiter, authMiddleware, adminRoute);

  const employeeRoute = require('./routes/Employee');
  app.use('/employee', apiLimiter, authMiddleware, employeeRoute);

  const abaRoute = require('./routes/ABA');
  app.use('/aba', apiLimiter, authMiddleware, abaRoute);

  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  app.use((err, req, res, next) => {
    if (err.status && err.status === 404) {
      return res.redirect(`${host}/PageNotFound`);
    }

    if (err.status) {
      return res.status(err.status).send(err.message || 'Internal Server Error');
    }

    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
  });

  console.log('[startup] Application routes registered');
}

function expressJsonMiddleware() {
  const express = require('express');
  return express.json();
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

async function bootstrap() {
  console.log('[startup] BMetrics API bootstrap beginning');
  console.log(
    '[startup] node=%s env=%s port=%s cwd=%s',
    process.version,
    process.env.NODE_ENV ?? '(unset)',
    process.env.PORT ?? '(unset)',
    process.cwd(),
  );

  const port = resolvePort();
  const express = require('express');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const { registerHealthRoutes } = require('./routes/health');
  registerHealthRoutes(app);
  console.log('[startup] Registered GET /healthz');

  await startHealthListener(app, port);

  await loadSecretsSafely();

  try {
    registerApplicationRoutes(app);
  } catch (error) {
    console.error('[startup] Route registration failed (healthz remains available):', error);
  }

  console.log(`[startup] Environment: ${process.env.NODE_ENV ?? '(unset)'}`);

  void initializeDatabase();
}

bootstrap().catch((error) => {
  console.error('[startup] Fatal bootstrap error:', error);
  process.exit(1);
});
