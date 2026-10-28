import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  serviceName: 'auth-service',
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3004', 10),
  apiPrefix: process.env.API_PREFIX || '/api/auth',
  jsonLimit: process.env.JSON_LIMIT || '100kb',
  mongoURI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/db_auth',
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey_uch_distributed_tp7_2026_jwt_token_sign_secure_example',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtIssuer: process.env.JWT_ISSUER || 'uch-distributed-auth',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',
  logMaxSize: process.env.LOG_MAX_SIZE || '20m'
};
