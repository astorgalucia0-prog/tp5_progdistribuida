import mongoose from 'mongoose';
import logger from './logger.js';

let isMongoConnected = false;
let mongoMemoryServer = null;

export async function connectDB(customURI) {
  const mongoURI = customURI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tp3_distribuida';

  try {
    mongoose.set('strictQuery', true);
    // Intentar conectar a MongoDB local (Community Server)
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000 // 3 segundos de tiempo de espera
    });

    isMongoConnected = true;
    logger.info(`[MongoDB] Conectado exitosamente a MongoDB Local: ${mongoURI}`);
  } catch (error) {
    isMongoConnected = false;
    logger.warn(`[MongoDB] No se pudo conectar a MongoDB local (${mongoURI}): ${error.message}`);

    // Intentar servidor MongoDB en memoria para pruebas automáticas si está disponible
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      isMongoConnected = true;
      logger.info(`[MongoDB Memory] Servidor MongoDB en memoria iniciado automáticamente para pruebas: ${memUri}`);
    } catch (memError) {
      isMongoConnected = false;
      logger.error('[MongoDB] MongoDB no está en ejecución. Por favor inicia el servicio de MongoDB en Windows ("net start MongoDB" o ejecute "mongod").');
    }
  }

  mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    logger.warn('[MongoDB] Conexión perdida con el servidor de MongoDB');
  });

  mongoose.connection.on('reconnected', () => {
    isMongoConnected = true;
    logger.info('[MongoDB] Conexión reestablecida con MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    isMongoConnected = false;
    logger.error(`[MongoDB] Error en la conexión de MongoDB: ${err.message}`);
  });
}

export function getIsMongoConnected() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

export async function closeDB() {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}
