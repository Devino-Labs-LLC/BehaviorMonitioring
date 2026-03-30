require('dotenv').config();

const jsonHandler = require('./functions/base/jsonHandler');
const { testConnection, syncDatabase } = require('./models');
const host = process.env.HOST;
const port = process.env.PORT;
const prodStatus = process.env.IN_PROD === "true";
const clientOrigin = process.env.ClientHost;
const amplifyOrigin = process.env.AmplifyHost;
const cors = require('cors');
const express = require('express');
const app = express();
const cookieParser = require("cookie-parser");
const csurf = require('csurf');
const authMiddleware = require('./middleware/authMiddleware');
const { requireRole } = require('./middleware/rbac');
const requestLogger = require('./middleware/requestLogger');
const { generalLimiter, apiLimiter } = require('./middleware/rateLimiter');
let prodHost = prodStatus ? `${process.env.HOST}` : `${process.env.HOST}${process.env.PORT ? `:${process.env.PORT}` : ''}`;

const csrfProtection = csurf({
  cookie: {
    key: '__Host-psifi.x-csrf-token',
    sameSite: 'strict',
    path: '/',
    secure: process.env.IN_PROD === 'true',
    httpOnly: true,
  },
});

// Define allowed origins
const allowedOrigins = [clientOrigin, amplifyOrigin].filter(Boolean);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
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
app.use(cookieParser());
app.use(csrfProtection);
app.use(cors(corsOptions));
app.use(express.json());

// Commented out to prevent automatic S3 import on server start
// if (prodStatus) {
//   prodHost = host;
//   jsonHandler.testJson();
//   AWS_S3_Bucket_Handler.importBackupFromS3();
// }

// Define your routes before the middleware for handling 404 errors
app.get('/', generalLimiter, (req, res) => {
  if (prodStatus === "true") {
    res.send("The server is running successfully. <br/>The server url is " + prodHost + "...");
  }
  else {
    res.send("The server is running successfully. <br/>The server is running on port " + port + "... <br/>The server url is " + prodHost + "...");
  }
});

// Endpoint to get CSRF token
app.get('/csrf-token', generalLimiter, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

const authRoute = require('./routes/Auth');
app.use('/auth', authRoute); // Rate limiting applied per-route in Auth.js

const adminRoute = require('./routes/Admin');
// Apply rate limiting at mount point for CodeQL detection
app.use('/admin', apiLimiter, authMiddleware, adminRoute);

const employeeRoute = require('./routes/Employee');
// Apply rate limiting at mount point for CodeQL detection
app.use('/employee', apiLimiter, authMiddleware, employeeRoute);

const abaRoute = require('./routes/ABA');
// Apply rate limiting at mount point for CodeQL detection
app.use('/aba', apiLimiter, authMiddleware, abaRoute);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Middleware for handling errors and setting CORS headers
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      statusCode: 403,
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  if (err.status && err.status === 404) {
    return res.redirect(host + '/PageNotFound');
  } 
  
  if (err.status) {
    return res.status(err.status).send(err.message || 'Internal Server Error');
  }

  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database schema (creates/updates tables automatically)
    await syncDatabase();
    
    // Start server
    app.listen(port, () => {
      console.log(`✓ Server running on port ${port}...`);
      console.log(`✓ Environment: ${process.env.NODE_ENV}`);
      console.log(`✓ Database: ${process.env.MYSQL_DATABASE} at ${process.env.MYSQL_HOST}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
