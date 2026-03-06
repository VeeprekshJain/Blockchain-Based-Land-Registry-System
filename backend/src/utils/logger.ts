/**
 * utils/logger.ts — Winston-based structured logger.
 */
import winston from 'winston';
import path from 'path';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const LOG_DIR = path.join(process.cwd(), 'logs');

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${stack ?? message}${metaStr}`;
  }),
);

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'rejections.log') }),
  ],
});

// Add http level for morgan integration
logger.add(
  new winston.transports.Console({
    level: 'http',
    format: consoleFormat,
    silent: process.env.NODE_ENV === 'production',
  }),
);
