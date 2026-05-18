const { registerHealthRoutes } = require('../../../routes/health');

describe('health routes', () => {
  it('registers GET /healthz that returns 200 JSON without dependencies', () => {
    const handlers = {};
    const app = {
      get(path, handler) {
        handlers[path] = handler;
      },
    };

    registerHealthRoutes(app);

    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
      },
    };

    handlers['/healthz']({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: 'bmetrics-api',
    });
    expect(typeof res.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });
});
