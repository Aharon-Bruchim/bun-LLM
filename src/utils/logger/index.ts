import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create file transport for production logs
const fileTransport = pino.destination({
    dest: path.join(logsDir, 'app.log'),
    sync: false, // Async for better performance
});

// Create pino logger with multiple targets
const pinoLogger = pino(
    {
        level: process.env['LOG_LEVEL'] || 'info',
        formatters: {
            level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
        // Console output (pretty in dev)
        {
            stream: process.stdout,
            level: 'debug',
        },
        // File output
        {
            stream: fileTransport,
            level: 'info',
        },
    ])
);

// Export logger with familiar interface
export const logger = {
    info: (message: string, data?: Record<string, unknown>) => {
        if (data) {
            pinoLogger.info(data, message);
        } else {
            pinoLogger.info(message);
        }
    },
    error: (message: string, data?: Record<string, unknown> | Error) => {
        if (data instanceof Error) {
            pinoLogger.error({ err: data }, message);
        } else if (data) {
            pinoLogger.error(data, message);
        } else {
            pinoLogger.error(message);
        }
    },
    debug: (message: string, data?: Record<string, unknown>) => {
        if (data) {
            pinoLogger.debug(data, message);
        } else {
            pinoLogger.debug(message);
        }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
        if (data) {
            pinoLogger.warn(data, message);
        } else {
            pinoLogger.warn(message);
        }
    },
    // Direct access to pino logger for advanced use
    pino: pinoLogger,
};

// Graceful shutdown - flush logs
process.on('beforeExit', () => {
    fileTransport.flushSync();
});
