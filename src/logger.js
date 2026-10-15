import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'node:path';
import fs from 'node:fs';

// Asegurar que la carpeta de logs exista
const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'info';
const maxFiles = process.env.LOG_MAX_FILES || '14d';
const maxSize = process.env.LOG_MAX_SIZE || '20m';

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMsg = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      logMsg += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      logMsg += `\nStack: ${stack}`;
    }
    return logMsg;
  })
);

// Transporte rotativo para logs generales
const transportAppLogs = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: maxSize,
  maxFiles: maxFiles,
  level: logLevel
});

// Transporte rotativo para errores
const transportErrorLogs = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: maxSize,
  maxFiles: maxFiles,
  level: 'error'
});

// Transporte de consola con colores para desarrollo
const transportConsole = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  )
});

const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    transportAppLogs,
    transportErrorLogs,
    transportConsole
  ]
});

export default logger;
