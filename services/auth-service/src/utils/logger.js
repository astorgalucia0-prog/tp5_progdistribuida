import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/index.js';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (e) {
    // Ignore in read-only environments
  }
}

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMsg = `[${timestamp}] [${config.serviceName}] [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      logMsg += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      logMsg += `\nStack: ${stack}`;
    }
    return logMsg;
  })
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${config.serviceName}] ${level}: ${message}`;
      })
    )
  })
];

if (fs.existsSync(logDir)) {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: `${config.serviceName}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: config.logMaxSize,
      maxFiles: config.logMaxFiles,
      format: customFormat
    })
  );
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: customFormat,
  transports
});

export default logger;
