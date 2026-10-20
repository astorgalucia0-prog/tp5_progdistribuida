import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  serviceName: 'api-gateway',
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '8080', 10),
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:3001',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:3002',
  ordersServiceUrl: process.env.ORDERS_SERVICE_URL || 'http://127.0.0.1:3003',
  logLevel: process.env.LOG_LEVEL || 'info',
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',
  logMaxSize: process.env.LOG_MAX_SIZE || '20m'
};
