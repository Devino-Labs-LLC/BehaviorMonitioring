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

function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl
            } ${res.statusCode} - ${duration}ms\n`;

        // Print to console (helpful during dev)
        console.log(logEntry.trim());

        // Append to log file
        fs.appendFile(logPath, logEntry, (err) => {
            if (err) console.error("Failed to write request log:", err);
        });
    });

    next();
}

module.exports = requestLogger;
