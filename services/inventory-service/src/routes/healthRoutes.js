import { Router } from 'express';
import { getIsMongoConnected } from '../database.js';
import { getIsRedisConnected } from '../redis.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/health', (req, res) => {
  const mongoOk = getIsMongoConnected();
  const redisOk = getIsRedisConnected();
  const allHealthy = mongoOk && redisOk;
  const statusCode = mongoOk ? 200 : 503;

  res.status(statusCode).json({
    service: config.serviceName,
    status: allHealthy ? 'ok' : (mongoOk ? 'degraded' : 'unhealthy'),
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: mongoOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected'
    }
  });
});

export default router;
