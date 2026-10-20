import { createClient } from 'redis';
import { config } from './config/index.js';
import logger from './utils/logger.js';

let isConnected = false;
const inMemoryLocks = new Map();

export const redisClient = createClient({
  url: config.redisUrl,
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Máximo número de reintentos a Redis alcanzado');
      }
      return Math.min(retries * 200, 3000);
    }
  }
});

redisClient.on('error', (err) => {
  isConnected = false;
  logger.warn(`[Redis] Error en cliente Redis: ${err.message}`);
});

redisClient.on('connect', () => {
  isConnected = true;
  logger.info(`[Redis] Conectado exitosamente a Redis: ${config.redisUrl}`);
});

redisClient.on('ready', () => {
  isConnected = true;
});

redisClient.on('end', () => {
  isConnected = false;
});

export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.ping();
    isConnected = true;
    logger.info(`[Redis] Ping a Redis exitoso en ${config.redisUrl}`);
    return true;
  } catch (err) {
    isConnected = false;
    logger.warn(`[Redis] No se pudo conectar a Redis (${config.redisUrl}): ${err.message}. Se usará fallback en memoria.`);
    return false;
  }
}

export function getIsRedisConnected() {
  return isConnected && redisClient.isOpen;
}

/**
 * Adquiere un lock sobre una clave específica en Redis.
 * Si Redis no está disponible, utiliza mapa en memoria como fallback.
 */
export async function acquireLock(key, token, ttlMs = config.lockTtlMs) {
  if (getIsRedisConnected()) {
    try {
      const result = await redisClient.set(key, token, {
        NX: true,
        PX: ttlMs
      });
      return result === 'OK';
    } catch (err) {
      logger.error(`[Redis Lock] Error adquiriendo lock [${key}]: ${err.message}`);
      return false;
    }
  }

  // Fallback en memoria
  const now = Date.now();
  const existing = inMemoryLocks.get(key);
  if (existing && existing.expiresAt > now) {
    return false;
  }

  inMemoryLocks.set(key, { token, expiresAt: now + ttlMs });
  return true;
}

/**
 * Libera un lock en Redis de forma atómica con script Lua.
 */
export async function releaseLock(key, token) {
  if (getIsRedisConnected()) {
    const luaScript = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redisClient.eval(luaScript, {
        keys: [key],
        arguments: [token]
      });
      return result === 1;
    } catch (err) {
      logger.error(`[Redis Lock] Error liberando lock [${key}]: ${err.message}`);
      return false;
    }
  }

  // Fallback en memoria
  const existing = inMemoryLocks.get(key);
  if (existing && existing.token === token) {
    inMemoryLocks.delete(key);
    return true;
  }
  return false;
}

export async function closeRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
    isConnected = false;
  }
}
