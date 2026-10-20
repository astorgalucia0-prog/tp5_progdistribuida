import app from './app.js';
import { config } from './config/index.js';
import logger from './utils/logger.js';

async function startServer() {
  logger.info(`====================================================`);
  logger.info(`Iniciando ${config.serviceName} en puerto ${config.port}`);
  logger.info(`Catalog Service URL: ${config.catalogServiceUrl}`);
  logger.info(`Inventory Service URL: ${config.inventoryServiceUrl}`);
  logger.info(`Orders Service URL: ${config.ordersServiceUrl}`);
  logger.info(`====================================================`);

  const server = app.listen(config.port, config.host, () => {
    logger.info(`[Server] ${config.serviceName} escuchando en http://${config.host}:${config.port}`);
  });

  const shutdown = async (signal) => {
    logger.info(`[Shutdown] Señal recibida: ${signal}. Cerrando Gateway...`);
    server.close(() => {
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
