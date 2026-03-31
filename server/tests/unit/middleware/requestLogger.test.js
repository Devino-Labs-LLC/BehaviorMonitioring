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
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fs = require('node:fs');
    requestLogger = require('../../../middleware/requestLogger');
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  it('logs and appends the request entry after the response finishes', () => {
    const listeners = {};
    const req = { method: 'GET', originalUrl: '/admin/health' };
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

  it('logs append failures without crashing', () => {
    fs.appendFile.mockImplementationOnce((path, entry, callback) =>
      callback(new Error('disk full')),
    );
    const listeners = {};
    const req = { method: 'POST', originalUrl: '/auth/login' };
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
      expect.any(Error),
    );
  });
});
