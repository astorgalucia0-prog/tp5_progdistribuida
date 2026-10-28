import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';
import { config } from './config/index.js';
import logger from './utils/logger.js';

const app = express();

app.use(cors());

// Middleware de logging de peticiones perimetrales
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[Gateway] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Endpoint de salud del API Gateway
app.get('/health', async (req, res) => {
  const checks = {
    gateway: 'ok',
    auth: 'unknown',
    catalog: 'unknown',
    inventory: 'unknown',
    orders: 'unknown'
  };

  try {
    const [authRes, catRes, invRes, ordRes] = await Promise.allSettled([
      fetch(`${config.authServiceUrl}/health`, { signal: AbortSignal.timeout(1000) }),
      fetch(`${config.catalogServiceUrl}/health`, { signal: AbortSignal.timeout(1000) }),
      fetch(`${config.inventoryServiceUrl}/health`, { signal: AbortSignal.timeout(1000) }),
      fetch(`${config.ordersServiceUrl}/health`, { signal: AbortSignal.timeout(1000) })
    ]);

    checks.auth = authRes.status === 'fulfilled' && authRes.value.ok ? 'healthy' : 'unreachable';
    checks.catalog = catRes.status === 'fulfilled' && catRes.value.ok ? 'healthy' : 'unreachable';
    checks.inventory = invRes.status === 'fulfilled' && invRes.value.ok ? 'healthy' : 'unreachable';
    checks.orders = ordRes.status === 'fulfilled' && ordRes.value.ok ? 'healthy' : 'unreachable';
  } catch (e) {
    // ignore
  }

  res.json({
    service: config.serviceName,
    status: 'ok',
    timestamp: new Date().toISOString(),
    downstream: checks
  });
});

// Endpoint agregado (Caso de Uso 2 del TP5): Consulta de ficha comercial + existencias en almacén
app.get('/api/products/:code', async (req, res, next) => {
  const { code } = req.params;
  try {
    logger.info(`[Gateway Aggregation] Agregando información de producto: ${code}`);

    const [catalogRes, inventoryRes] = await Promise.all([
      fetch(`${config.catalogServiceUrl}/api/catalog/products/${code}`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${config.inventoryServiceUrl}/api/inventory/${code}`, { signal: AbortSignal.timeout(2000) })
    ]);

    if (catalogRes.status === 404) {
      return res.status(404).json({ error: `Producto '${code}' no encontrado en catálogo.` });
    }

    if (!catalogRes.ok) {
      return res.status(502).json({ error: 'Fallo al consultar Catalog Service' });
    }

    const catalogData = await catalogRes.json();
    let stockDisponible = 0;
    let disponibleParaVenta = false;

    if (inventoryRes.ok) {
      const inventoryData = await inventoryRes.json();
      stockDisponible = inventoryData.stock_disponible || 0;
      disponibleParaVenta = Boolean(inventoryData.disponible_para_venta);
    }

    res.json({
      code: catalogData.codigo,
      nombre: catalogData.nombre,
      precio: catalogData.precio,
      categoria: catalogData.categoria,
      descripcion: catalogData.descripcion,
      stock: stockDisponible,
      disponible: disponibleParaVenta,
      activo: catalogData.activo
    });
  } catch (err) {
    logger.error(`[Gateway Aggregation Error] ${err.message}`);
    res.status(503).json({
      error: 'ServiceUnavailable',
      message: `No se pudo consolidar la información del producto (${err.message})`,
      statusCode: 503
    });
  }
});

// Proxy hacia Auth Service (/api/auth/*)
app.use(
  '/api/auth',
  proxy(config.authServiceUrl, {
    proxyReqPathResolver: (req) => `/api/auth${req.url}`,
    proxyErrorHandler: (err, res, next) => {
      logger.error(`[Gateway Proxy Error] Fallo al reenviar a Auth Service: ${err.message}`);
      res.status(503).json({
        service: config.serviceName,
        error: 'ServiceUnavailable',
        message: 'Auth Service no se encuentra disponible',
        target: config.authServiceUrl
      });
    }
  })
);

// Proxy hacia Catalog Service (/api/catalog/*)
app.use(
  '/api/catalog',
  proxy(config.catalogServiceUrl, {
    proxyReqPathResolver: (req) => `/api/catalog${req.url}`,
    proxyErrorHandler: (err, res, next) => {
      logger.error(`[Gateway Proxy Error] Fallo al reenviar a Catalog Service: ${err.message}`);
      res.status(503).json({
        service: config.serviceName,
        error: 'ServiceUnavailable',
        message: 'Catalog Service no se encuentra disponible',
        target: config.catalogServiceUrl
      });
    }
  })
);

// Proxy hacia Inventory Service (/api/inventory/*)
app.use(
  '/api/inventory',
  proxy(config.inventoryServiceUrl, {
    proxyReqPathResolver: (req) => `/api/inventory${req.url}`,
    proxyErrorHandler: (err, res, next) => {
      logger.error(`[Gateway Proxy Error] Fallo al reenviar a Inventory Service: ${err.message}`);
      res.status(503).json({
        service: config.serviceName,
        error: 'ServiceUnavailable',
        message: 'Inventory Service no se encuentra disponible',
        target: config.inventoryServiceUrl
      });
    }
  })
);

// Proxy hacia Orders Service (/api/orders/*)
app.use(
  '/api/orders',
  proxy(config.ordersServiceUrl, {
    proxyReqPathResolver: (req) => `/api/orders${req.url}`,
    proxyErrorHandler: (err, res, next) => {
      logger.error(`[Gateway Proxy Error] Fallo al reenviar a Orders Service: ${err.message}`);
      res.status(503).json({
        service: config.serviceName,
        error: 'ServiceUnavailable',
        message: 'Orders Service no se encuentra disponible',
        target: config.ordersServiceUrl
      });
    }
  })
);

// Ruta Raíz descriptiva
app.get('/', (req, res) => {
  res.json({
    service: 'API Gateway - TP7 Microservicios con Seguridad JWT',
    endpoints: {
      health: '/health',
      auth_register: '/api/auth/register',
      auth_login: '/api/auth/login',
      auth_me: '/api/auth/me',
      auth_swagger: `${config.authServiceUrl}/api-docs`,
      catalog: '/api/catalog/products',
      catalog_swagger: `${config.catalogServiceUrl}/api-docs`,
      inventory: '/api/inventory/:code',
      inventory_swagger: `${config.inventoryServiceUrl}/api-docs`,
      orders: '/api/orders',
      orders_swagger: `${config.ordersServiceUrl}/api-docs`,
      aggregated_product: '/api/products/:code'
    }
  });
});

export default app;
