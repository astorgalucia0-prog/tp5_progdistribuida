import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] orders-service: La variable de entorno JWT_SECRET es obligatoria y no está configurada.');
  process.exit(1);
}

export const config = {
  serviceName: 'orders-service',
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3003', 10),
  apiPrefix: process.env.API_PREFIX || '/api/orders',
  jsonLimit: process.env.JSON_LIMIT || '100kb',
  mongoURI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/db_orders',
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:3001',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:3002',
  jwtSecret: process.env.JWT_SECRET,
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',
  logMaxSize: process.env.LOG_MAX_SIZE || '20m'
};
