/**
 * Process-level guards for unexpected failures.
 * Expected HTTP 4xx paths must never call process.exit.
 * Fatal corruption may terminate so Elastic Beanstalk can replace the process.
 *
 * @param {{ logger?: { error: Function }, exit?: (code: number) => void }} [options]
 * @returns {{ dispose: () => void }}
 */
function registerProcessGuards(options = {}) {
  const logger = options.logger || console;
  const exit = options.exit || ((code) => process.exit(code));

  function onUncaughtException(error) {
    logger.error('[fatal] uncaughtException:', {
      message: error && error.message,
      stack: error && error.stack,
    });
    exit(1);
  }

  function onUnhandledRejection(reason) {
    logger.error('[fatal] unhandledRejection:', {
      message: reason && reason.message ? reason.message : String(reason),
      stack: reason && reason.stack,
    });
    // Do not exit on every rejection — log loudly. Corrupting uncaughtException still exits.
  }

  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  return {
    dispose() {
      process.removeListener('uncaughtException', onUncaughtException);
      process.removeListener('unhandledRejection', onUnhandledRejection);
    },
  };
}

module.exports = { registerProcessGuards };
