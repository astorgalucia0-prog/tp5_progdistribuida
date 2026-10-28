import mongoose from 'mongoose';
import { config } from './config/index.js';
import logger from './utils/logger.js';

let isMongoConnected = false;

export async function connectDB() {
  const mongoURI = config.mongoURI;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });

    isMongoConnected = true;
    logger.info(`[MongoDB] Conectado exitosamente a MongoDB: ${mongoURI}`);
  } catch (error) {
    isMongoConnected = false;
    logger.warn(`[MongoDB] No se pudo conectar a MongoDB (${mongoURI}): ${error.message}`);
  }

  mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    logger.warn('[MongoDB] Conexión perdida con MongoDB');
  });

  mongoose.connection.on('reconnected', () => {
    isMongoConnected = true;
    logger.info('[MongoDB] Conexión reestablecida con MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    isMongoConnected = false;
    logger.error(`[MongoDB] Error en conexión MongoDB: ${err.message}`);
  });
}

export function getIsMongoConnected() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isMongoConnected = false;
  }
}
