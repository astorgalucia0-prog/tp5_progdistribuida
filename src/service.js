import express from 'express';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

import endpoints, { sembrarDatosIniciales } from './endpoints.js';
import { connectRedis } from './redis.js';
import { connectDB } from './database.js';
import logger from './logger.js';
import { setupSwagger } from './swagger.js';
import { getClusterConfig } from './raft/nodeConfig.js';
import { RaftNode } from './raft/raftNode.js';
import { createRaftRouter } from './raft/raftRouter.js';

const app = express();

const HOST = process.env.HOST || '127.0.0.1';
const API_PREFIX = process.env.API_PREFIX || '/api';
const JSON_LIMIT = process.env.JSON_LIMIT || '100kb';

// Inicializar configuración del cluster Raft (Hito 1)
const clusterConfig = getClusterConfig();
export const raftNode = new RaftNode(clusterConfig);

app.use(express.json({ limit: JSON_LIMIT }));

// Middleware para logging de solicitudes HTTP entrantes
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const duracion = Date.now() - inicio;
    logger.info(`[HTTP REQUEST] [${clusterConfig.nodeId}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duracion}ms)`);
  });
  next();
});

// Servir el panel de administración web (public/index.html)
app.use(express.static('public'));

// Configurar Swagger UI y documentación OpenAPI en /api-docs y /api-docs.json
setupSwagger(app);

// Montar endpoints de Raft (Diagnóstico y RPCs)
app.use('/raft', createRaftRouter(raftNode));
app.use(`${API_PREFIX}/raft`, createRaftRouter(raftNode));

// Montar router de endpoints de la API REST
app.use(API_PREFIX, endpoints);

async function startServer() {
  logger.info('========================================================');
  logger.info(` Iniciando Nodo Raft [${clusterConfig.nodeId}] (Puerto ${clusterConfig.httpPort})`);
  logger.info(` Database URI: ${clusterConfig.mongoURI}`);
  logger.info('========================================================');

  // 1. Conectar a MongoDB mediante Mongoose y sembrar datos si está vacía
  await connectDB(clusterConfig.mongoURI);
  await sembrarDatosIniciales();


  // 2. Conectar y verificar Redis / Memurai
  const redisPong = await connectRedis();
  const redisStatus = redisPong === 'PONG' ? 'PONG' : 'DESCONECTADO';
  logger.info(`[Redis] Estado del servidor: ${redisStatus}`);

  // 3. Levantar Servidor HTTP
  const httpEnabled = process.env.HTTP_ENABLED !== 'false';
  const httpPort = clusterConfig.httpPort;

  if (httpEnabled) {
    const httpServer = http.createServer(app);
    httpServer.listen(httpPort, HOST, () => {
      logger.info(`[HTTP] Servidor en ejecución: http://${HOST}:${httpPort}${API_PREFIX}`);
      logger.info(`[Swagger] Documentación interactiva en: http://${HOST}:${httpPort}/api-docs`);
    });
  }

  // 4. Levantar Servidor HTTPS
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
  const httpsPort = clusterConfig.httpsPort;
  const pfxPath = process.env.HTTPS_PFX_PATH || './certs/localhost.pfx';
  const pfxPassphrase = process.env.HTTPS_PFX_PASSPHRASE || 'tp2-cert-2026';

  if (httpsEnabled) {
    try {
      const resolvedPfxPath = path.resolve(pfxPath);
      if (fs.existsSync(resolvedPfxPath)) {
        const pfx = fs.readFileSync(resolvedPfxPath);
        const httpsOptions = {
          pfx,
          passphrase: pfxPassphrase
        };

        const httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(httpsPort, () => {
          logger.info(`[HTTPS] Servidor seguro en ejecución: https://localhost:${httpsPort}${API_PREFIX}`);
          logger.info(`[Swagger HTTPS] Documentación interactiva en: https://localhost:${httpsPort}/api-docs`);
        });
      } else {
        logger.error(`[HTTPS Error] No se encontró el certificado PFX en ${resolvedPfxPath}`);
      }
    } catch (err) {
      logger.error(`[HTTPS Error] ${err.message}`);
    }
  }
}

startServer();
