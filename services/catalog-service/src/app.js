import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import catalogRoutes from './routes/catalogRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { setupSwagger } from './swagger/swagger.js';
import logger from './utils/logger.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: config.jsonLimit }));

// Middleware de logging de requests HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Swagger UI
setupSwagger(app);

// Rutas de salud
app.use('/', healthRoutes);
app.use(config.apiPrefix, healthRoutes);

// Rutas de negocio
app.use(config.apiPrefix, catalogRoutes);

// Manejador global de errores
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  if (statusCode >= 500) {
    logger.error(`[Error] ${req.method} ${req.originalUrl}: ${message}\nStack: ${err.stack}`);
  } else {
    logger.warn(`[Warning] ${req.method} ${req.originalUrl} (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    service: config.serviceName,
    error: statusCode >= 500 ? 'InternalServerError' : err.name || 'Error',
    message,
    statusCode
  });
});

export default app;
