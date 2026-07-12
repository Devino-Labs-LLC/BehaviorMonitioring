const { isApiPath } = require('./apiPaths');

/**
 * Resolve HTTP status from an error without treating missing status as 500 prematurely.
 * @param {Error & { status?: number, statusCode?: number, type?: string }} err
 * @returns {number}
 */
function resolveStatus(err) {
  const code = err.status || err.statusCode;
  if (typeof code === 'number' && code >= 400 && code < 600) {
    return code;
  }
  if (err.type === 'entity.parse.failed') {
    return 400;
  }
  if (err.message === 'Not allowed by CORS') {
    return 403;
  }
  return 500;
}

/**
 * Safe client-facing message — never expose stacks or secrets.
 * @param {Error} err
 * @param {number} status
 * @returns {string}
 */
function clientMessage(err, status) {
  if (status === 400 && (err.type === 'entity.parse.failed' || /json/i.test(err.message || ''))) {
    return 'Malformed JSON in request body';
  }
  if (status === 403 && err.message === 'Not allowed by CORS') {
    return 'Not allowed by CORS';
  }
  if (status >= 400 && status < 500 && err.message && !/at\s+\S+\s+\(/.test(err.message)) {
    // Prefer short operational messages; drop anything that looks like a stack frame
    const msg = String(err.message).split('\n')[0];
    if (msg.length <= 200) {
      return msg;
    }
  }
  if (status >= 500) {
    return 'Internal Server Error';
  }
  return 'Request failed';
}

/**
 * Centralized Express error handler.
 * Expected 4xx keep their status; unexpected errors → 500.
 * Never redirects. Never logs expected 4xx as application failures.
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, _next) {
  const status = resolveStatus(err);
  const exposeApi = isApiPath(req.path) || req.accepts('json') === 'json';

  if (status >= 500) {
    console.error('Unhandled error:', {
      message: err.message,
      status,
      method: req.method,
      path: req.path,
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }),
    });
  }

  if (res.headersSent) {
    return;
  }

  const message = clientMessage(err, status);

  if (exposeApi || status === 400) {
    return res.status(status).json({
      statusCode: status,
      success: false,
      message,
    });
  }

  return res.status(status).type('text/plain').send(message);
}

module.exports = {
  errorHandler,
  resolveStatus,
  clientMessage,
};
