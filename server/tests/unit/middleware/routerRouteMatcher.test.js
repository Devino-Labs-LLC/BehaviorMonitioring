const express = require('express');
const {
  listRouterRoutes,
  createRouterRouteMatcher,
} = require('../../../middleware/routerRouteMatcher');

describe('routerRouteMatcher', () => {
  it('lists routes from the actual Express router stack', () => {
    const router = express.Router();
    router.post('/getAllAdmins', (req, res) => res.sendStatus(200));
    router.post('/createClient', (req, res) => res.sendStatus(200));

    expect(listRouterRoutes(router)).toEqual(
      expect.arrayContaining([
        { method: 'post', path: '/getAllAdmins' },
        { method: 'post', path: '/createClient' },
      ]),
    );
  });

  it('matches only registered method+path pairs', () => {
    const router = express.Router();
    router.post('/getAllAdmins', (req, res) => res.sendStatus(200));
    const isKnownRoute = createRouterRouteMatcher(router);

    expect(isKnownRoute({ method: 'POST', path: '/getAllAdmins' })).toBe(true);
    expect(isKnownRoute({ method: 'GET', path: '/getAllAdmins' })).toBe(false);
    expect(isKnownRoute({ method: 'POST', path: '/wp-admin' })).toBe(false);
  });
});
