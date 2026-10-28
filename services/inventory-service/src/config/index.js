import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  serviceName: 'inventory-service',
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3002', 10),
  apiPrefix: process.env.API_PREFIX || '/api/inventory',
  jsonLimit: process.env.JSON_LIMIT || '100kb',
  mongoURI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/db_inventory',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  lockTtlMs: parseInt(process.env.LOCK_TTL_MS || '5000', 10),
  reservationTtlSeconds: parseInt(process.env.RESERVATION_TTL_SECONDS || '600', 10),
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey_uch_distributed_tp7_2026_jwt_token_sign_secure_example',
  logLevel: process.env.LOG_LEVEL || 'info',
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',
  logMaxSize: process.env.LOG_MAX_SIZE || '20m'
};
