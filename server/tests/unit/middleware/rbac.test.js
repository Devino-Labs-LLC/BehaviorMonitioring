const { requirePermission, requireRole } = require('../../../middleware/rbac');

describe('rbac middleware', () => {
  function createResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  it('allows access when the user has the required role', () => {
    const next = jest.fn();

    requireRole('admin')({ user: { roles: ['admin'] } }, createResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it('blocks access when the user is missing the required role', () => {
    const res = createResponse();
    const next = jest.fn();

    requireRole('admin')({ user: { roles: ['technician'] } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access when the user has the required permission', () => {
    const next = jest.fn();

    requirePermission('write:notes')(
      { user: { permissions: ['write:notes'] } },
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('blocks access when the user is missing the required permission', () => {
    const res = createResponse();
    const next = jest.fn();

    requirePermission('write:notes')(
      { user: { permissions: ['read:notes'] } },
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
