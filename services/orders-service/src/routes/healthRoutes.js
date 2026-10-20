import { Router } from 'express';
import { getIsMongoConnected } from '../database.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/health', (req, res) => {
  const mongoOk = getIsMongoConnected();
  const statusCode = mongoOk ? 200 : 503;

  res.status(statusCode).json({
    service: config.serviceName,
    status: mongoOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: mongoOk ? 'connected' : 'disconnected',
      catalog_service: config.catalogServiceUrl,
      inventory_service: config.inventoryServiceUrl
    }
  });
});

export default router;
