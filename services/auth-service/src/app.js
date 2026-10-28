import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { setupSwagger } from './swagger/swagger.js';
import logger from './utils/logger.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: config.jsonLimit }));

// Middleware de observabilidad de peticiones HTTP (sin exponer passwords ni tokens completos)
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

// Rutas de identidad y autenticación
app.use(config.apiPrefix, authRoutes);

// Manejador global de errores estandarizado (Consigna 18)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const message = err.message || 'Error interno del servidor';

  if (statusCode >= 500) {
    logger.error(`[Error] ${req.method} ${req.originalUrl}: ${message}\nStack: ${err.stack}`);
  } else {
    logger.warn(`[Warning] ${req.method} ${req.originalUrl} (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    service: config.serviceName,
    error:
      statusCode === 400
        ? 'BadRequest'
        : statusCode === 401
          ? 'Unauthorized'
          : statusCode === 403
            ? 'Forbidden'
            : statusCode === 409
              ? 'Conflict'
              : 'InternalServerError',
    message,
    statusCode
  });
});

export default app;
