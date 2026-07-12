jest.mock('node:fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFile: jest.fn((path, entry, callback) => callback(null)),
}));

describe('requestLogger middleware', () => {
  let requestLogger;
  let fs;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.LOG_SCANNER_REQUESTS = 'true';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fs = require('node:fs');
    requestLogger = require('../../../middleware/requestLogger');
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    process.env.LOG_SCANNER_REQUESTS = 'false';
  });

  it('logs and appends the request entry after the response finishes', () => {
    const listeners = {};
    const req = { method: 'GET', path: '/admin/health', originalUrl: '/admin/health' };
    const res = {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
      }),
    };
    const next = jest.fn();

    requestLogger(req, res, next);
    listeners.finish();

    expect(next).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GET /admin/health 200'));
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('GET /admin/health 200'),
      expect.any(Function),
    );
  });

  it('suppresses routine 404 scanner logs when LOG_SCANNER_REQUESTS is false', () => {
    process.env.LOG_SCANNER_REQUESTS = 'false';
    jest.resetModules();
    fs = require('node:fs');
    requestLogger = require('../../../middleware/requestLogger');

    const listeners = {};
    const req = { method: 'GET', path: '/wp-admin', originalUrl: '/wp-admin' };
    const res = {
      statusCode: 404,
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
      }),
    };

    requestLogger(req, res, jest.fn());
    listeners.finish();

    expect(console.log).not.toHaveBeenCalled();
    expect(fs.appendFile).not.toHaveBeenCalled();
  });

  it('logs 5xx at error level', () => {
    const listeners = {};
    const req = { method: 'POST', path: '/auth/login', originalUrl: '/auth/login' };
    const res = {
      statusCode: 500,
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
      }),
    };

    requestLogger(req, res, jest.fn());
    listeners.finish();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('POST /auth/login 500'));
  });

  it('logs append failures without crashing', () => {
    fs.appendFile.mockImplementationOnce((path, entry, callback) =>
      callback(new Error('disk full')),
    );
    const listeners = {};
    const req = { method: 'POST', path: '/auth/login', originalUrl: '/auth/login' };
    const res = {
      statusCode: 500,
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
      }),
    };

    requestLogger(req, res, jest.fn());
    listeners.finish();

    expect(console.error).toHaveBeenCalledWith(
      'Failed to write request log:',
      expect.any(String),
    );
  });

  it('creates the logs directory and file when they are missing on import', () => {
    fs.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    jest.resetModules();
    const freshFs = require('node:fs');
    freshFs.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);
    require('../../../middleware/requestLogger');

    expect(freshFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(freshFs.writeFileSync).toHaveBeenCalledWith(expect.any(String), '', 'utf8');
  });
});
