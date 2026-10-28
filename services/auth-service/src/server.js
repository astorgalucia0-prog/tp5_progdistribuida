import app from './app.js';
import { config } from './config/index.js';
import { connectDB, closeDB } from './database.js';
import { AuthService } from './services/authService.js';
import logger from './utils/logger.js';

async function startServer() {
  logger.info(`====================================================`);
  logger.info(`Iniciando ${config.serviceName} en puerto ${config.port}`);
  logger.info(`Entorno: ${config.nodeEnv}`);
  logger.info(`MongoDB URI: ${config.mongoURI}`);
  logger.info(`JWT Issuer: ${config.jwtIssuer} | Vigencia: ${config.jwtExpiresIn}`);
  logger.info(`====================================================`);

  await connectDB();
  await AuthService.seedInitialUsers();

  const server = app.listen(config.port, config.host, () => {
    logger.info(`[Server] ${config.serviceName} escuchando en http://${config.host}:${config.port}${config.apiPrefix}`);
    logger.info(`[Swagger] Documentación disponible en http://${config.host}:${config.port}/api-docs`);
  });

  const shutdown = async (signal) => {
    logger.info(`[Shutdown] Señal recibida: ${signal}. Cerrando servidor...`);
    server.close(async () => {
      await closeDB();
      logger.info(`[Shutdown] ${config.serviceName} finalizado correctamente.`);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  logger.error(`[Fatal] Error al iniciar ${config.serviceName}: ${err.message}`);
  process.exit(1);
});
