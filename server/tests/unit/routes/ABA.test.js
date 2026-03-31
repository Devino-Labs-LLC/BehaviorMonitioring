describe('ABA route registration', () => {
  function loadRouter() {
    jest.resetModules();

    const handlers = {};
    const use = jest.fn();
    const post = jest.fn((path, handler) => {
      handlers[path] = handler;
    });
    const router = { use, post };
    const Router = jest.fn(() => router);

    jest.doMock('express', () => ({ Router }));
    jest.doMock('../../../middleware/rateLimiter', () => ({
      apiLimiter: 'api-limiter',
    }));
    jest.doMock('../../../controllers/ABAController', () => ({
      addNewClient: jest.fn(),
      getClientInfo: jest.fn(),
      updateClientInfo: jest.fn(),
      deleteClientInfo: jest.fn(),
      getAllClientInfo: jest.fn(),
      addNewTargetBehavior: jest.fn(),
      updateTargetBehavior: jest.fn(),
      deleteTargetBehavior: jest.fn(),
      getTargetBehavior: jest.fn(),
      getClientTargetBehavior: jest.fn(),
      getAClientTargetBehavior: jest.fn(),
      getArchivedBehavior: jest.fn(),
      getClientArchivedBehavior: jest.fn(),
      getAClientArchivedBehavior: jest.fn(),
      getAArchivedBehaviorData: jest.fn(),
      submitTargetBehavior: jest.fn(),
      mergeBehaviors: jest.fn(),
      archiveBehavior: jest.fn(),
      deleteBehavior: jest.fn(),
      deleteBehaviorData: jest.fn(),
      activateBehavior: jest.fn(),
      deleteArchivedBehavior: jest.fn(),
      deleteArchivedBehaviorData: jest.fn(),
      submitSessionNotes: jest.fn(),
      getSessionNotes: jest.fn(),
      getASessionNote: jest.fn(),
      deleteSessionNote: jest.fn(),
      getArchivedSessionNotes: jest.fn(),
      getAArchivedSessionNote: jest.fn(),
      activateSessionNote: jest.fn(),
      archiveSessionNote: jest.fn(),
      deleteArchivedSessionNote: jest.fn(),
      getClientSkillAquisition: jest.fn(),
      submitSkillAquisition: jest.fn(),
    }));

    const routeModule = require('../../../routes/ABA');
    return { routeModule, Router, router, handlers, use, post };
  }

  it('mounts the API limiter for all ABA routes', () => {
    const { routeModule, use } = loadRouter();

    expect(routeModule).toBeDefined();
    expect(use).toHaveBeenCalledWith('api-limiter');
  });

  it('registers the main client, behavior, session, and skill endpoints', () => {
    const { handlers, post } = loadRouter();

    expect(post).toHaveBeenCalled();
    expect(handlers['/addNewClient']).toEqual(expect.any(Function));
    expect(handlers['/submitTargetBehavior']).toEqual(expect.any(Function));
    expect(handlers['/submitSessionNotes']).toEqual(expect.any(Function));
    expect(handlers['/submitSkillAquisition']).toEqual(expect.any(Function));
  });
});
