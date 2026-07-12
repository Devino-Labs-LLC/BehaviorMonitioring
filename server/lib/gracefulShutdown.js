const DEFAULT_DRAIN_MS = 10000;

/**
 * Register SIGTERM / SIGINT graceful shutdown.
 * Stops accepting new connections, drains in-flight requests, closes DB pool.
 *
 * @param {{
 *   server: import('http').Server,
 *   getSequelize?: () => { close: () => Promise<void> } | null | undefined,
 *   drainMs?: number,
 *   logger?: { log: Function, error: Function },
 *   exit?: (code: number) => void,
 * }} options
 * @returns {{ shutdown: (signal: string) => Promise<void>, dispose: () => void }}
 */
function registerGracefulShutdown(options) {
  const {
    server,
    getSequelize = () => null,
    drainMs = DEFAULT_DRAIN_MS,
    logger = console,
    exit = (code) => process.exit(code),
  } = options;

  let shuttingDown = false;
  const signals = ['SIGTERM', 'SIGINT'];

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.log(`[shutdown] ${signal} received — draining up to ${drainMs}ms`);

    const forceTimer = setTimeout(() => {
      logger.error('[shutdown] Drain timeout exceeded — forcing exit');
      exit(1);
    }, drainMs);
    if (typeof forceTimer.unref === 'function') {
      forceTimer.unref();
    }

    try {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    } catch (error) {
      logger.error('[shutdown] Error closing HTTP server:', error.message || error);
    }

    try {
      const sequelize = getSequelize();
      if (sequelize && typeof sequelize.close === 'function') {
        await sequelize.close();
        logger.log('[shutdown] Database pool closed');
      }
    } catch (error) {
      logger.error('[shutdown] Error closing database pool:', error.message || error);
    }

    clearTimeout(forceTimer);
    logger.log('[shutdown] Clean exit');
    exit(0);
  }

  const listeners = signals.map((signal) => {
    const handler = () => {
      void shutdown(signal);
    };
    process.on(signal, handler);
    return { signal, handler };
  });

  function dispose() {
    for (const { signal, handler } of listeners) {
      process.removeListener(signal, handler);
    }
  }

  return { shutdown, dispose };
}

module.exports = {
  registerGracefulShutdown,
  DEFAULT_DRAIN_MS,
};
