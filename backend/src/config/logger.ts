import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), myFormat),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
  ],
});

// Hosted services collect stdout/stderr in production as well.
logger.add(
  new winston.transports.Console({
    stderrLevels: ['error'],
    format: process.env.NODE_ENV === 'production'
      ? combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), myFormat)
      : combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), myFormat),
  })
);
