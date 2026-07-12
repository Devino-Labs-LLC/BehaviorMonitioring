const fs = require('node:fs');
const path = require('node:path');

// Path to logs directory and log file
const logsDir = path.join(__dirname, '../logs');
const logPath = path.join(logsDir, 'requests.log');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure the log file exists
if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '', 'utf8');  // create empty file
}

/**
 * LOG_SCANNER_REQUESTS=false (default) suppresses routine 404 request lines
 * that are typical of internet scanners. Set true to log all statuses temporarily.
 */
function shouldLogScannerRequests() {
    return process.env.LOG_SCANNER_REQUESTS === 'true';
}

/**
 * Routine scanner noise: 404 without Authorization (no sensitive headers logged anyway).
 * @param {import('express').Request} req
 * @param {number} statusCode
 */
function isRoutineScanner404(req, statusCode) {
    return statusCode === 404 && !shouldLogScannerRequests();
}

/**
 * Build a safe log line — never include Authorization, cookies, tokens, or bodies.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {number} durationMs
 */
function formatLogEntry(req, res, durationMs) {
    const method = req.method;
    // Prefer originalUrl so mount points (e.g. /admin) are not stripped after routing
    const raw = req.originalUrl || req.url || req.path || '';
    const urlPath = String(raw).split('?')[0] || '';
    return `[${new Date().toISOString()}] ${method} ${urlPath} ${res.statusCode} - ${durationMs}ms\n`;
}

function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        if (isRoutineScanner404(req, statusCode)) {
            return;
        }

        const logEntry = formatLogEntry(req, res, duration);

        if (statusCode >= 500) {
            console.error(logEntry.trim());
        } else {
            console.log(logEntry.trim());
        }

        fs.appendFile(logPath, logEntry, (err) => {
            if (err) console.error('Failed to write request log:', err.message || err);
        });
    });

    next();
}

module.exports = requestLogger;
module.exports.formatLogEntry = formatLogEntry;
module.exports.shouldLogScannerRequests = shouldLogScannerRequests;
module.exports.isRoutineScanner404 = isRoutineScanner404;
