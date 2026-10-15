import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 1000,
    reconnectStrategy: false
  }
});

redisClient.on('error', () => {});

let isConnected = false;

// Map para fallback en memoria si Memurai no está iniciado
const inMemoryLocks = new Map();

export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const pong = await redisClient.ping();
    isConnected = true;
    return pong;
  } catch (err) {
    isConnected = false;
    return null;
  }
}

export function getIsRedisConnected() {
  return isConnected && redisClient.isOpen;
}

/**
 * Adquiere un lock sobre una clave específica en Memurai/Redis.
 * Si Redis está desconectado, utiliza un mapa de exclusion mutua en memoria como fallback.
 * @param {string} key - Clave del lock (ej: 'lock:producto:1')
 * @param {string} token - Identificador único de propiedad (UUID)
 * @param {number} ttlMs - Tiempo de vida en milisegundos (PX)
 * @returns {Promise<boolean>} - true si se adquirió el lock, false en caso contrario
 */
export async function acquireLock(key, token, ttlMs = 5000) {
  if (getIsRedisConnected()) {
    try {
      // Comando Redis: SET key token NX PX ttlMs
      const result = await redisClient.set(key, token, {
        NX: true,
        PX: ttlMs
      });
      return result === 'OK';
    } catch (err) {
      console.error(`Error adquiriendo lock Redis [${key}]:`, err.message);
      return false;
    }
  }

  // --- Fallback en memoria cuando Memurai no está iniciado ---
  const now = Date.now();
  const existing = inMemoryLocks.get(key);
  if (existing && existing.expiresAt > now) {
    return false; // Recurso bloqueado
  }

  inMemoryLocks.set(key, { token, expiresAt: now + ttlMs });
  return true;
}

/**
 * Libera un lock en Memurai/Redis de manera atómica usando un script Lua.
 * Solo elimina la clave si el valor almacenado coincide con el token del propietario.
 * @param {string} key - Clave del lock
 * @param {string} token - Token de propiedad del solicitante
 * @returns {Promise<boolean>} - true si se liberó el lock, false si expiró o pertenecía a otro
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
      console.error(`Error liberando lock Redis [${key}]:`, err.message);
      return false;
    }
  }

  // --- Fallback en memoria ---
  const existing = inMemoryLocks.get(key);
  if (existing && existing.token === token) {
    inMemoryLocks.delete(key);
    return true;
  }
  return false;
}
