import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Producto from './models/Producto.js';
import { acquireLock, releaseLock, getIsRedisConnected } from './redis.js';
import { getIsMongoConnected } from './database.js';
import logger from './logger.js';
import { raftNode } from './service.js';

const router = Router();

// Helper para verificar conexión a MongoDB antes de hacer consultas
function verificarConexionMongo(res) {
  if (!getIsMongoConnected()) {
    logger.warn('[MongoDB] Petición denegada: El servicio de MongoDB no está activo.');
    res.status(503).json({
      error: 'Servicio de persistencia (MongoDB) no disponible',
      mensaje: 'MongoDB no está iniciado en el puerto 27017.'
    });
    return false;
  }
  return true;
}

// Helper para proponer consensos en Raft o rechazar si el nodo es FOLLOWER (Hito 5)
async function proponerConsensoORechazar(res, command) {
  if (raftNode.role !== 'LEADER') {
    const leaderPeer = raftNode.peers.find(p => p.id === raftNode.leaderId);
    const leaderUrl = leaderPeer ? leaderPeer.url : (raftNode.leaderId ? `http://127.0.0.1:300${raftNode.leaderId.slice(-1)}` : 'Desconocido');

    logger.warn(`[HTTP] Escritura denegada en ${raftNode.nodeId} (Rol: ${raftNode.role}). Redirigiendo a Leader: ${raftNode.leaderId || 'Desconocido'}`);
    res.status(409).json({
      error: 'Operación de escritura denegada: Este nodo no es el Leader actual del cluster.',
      nodoId: raftNode.nodeId,
      rolActual: raftNode.role,
      leaderId: raftNode.leaderId || 'Desconocido',
      leaderUrl: leaderUrl,
      instruccion: 'Envíe las operaciones de escritura directamente al Leader del cluster.'
    });
    return null;
  }

  const result = await raftNode.proposeCommand(command);
  if (!result.success) {
    res.status(500).json({
      error: 'Error al alcanzar consenso en el cluster Raft',
      detalle: result.error || result.mensaje
    });
    return null;
  }

  return result;
}

// Helper para sembrar productos iniciales si la base de datos está vacía
export async function sembrarDatosIniciales() {
  try {
    if (getIsMongoConnected()) {
      const cantidad = await Producto.countDocuments();
      if (cantidad === 0) {
        await Producto.create([
          {
            codigo: 'PROD-001',
            nombre: 'Teclado mecánico',
            precio: 45000,
            stock: 10,
            categoria: 'Periféricos',
            descripcion: 'Teclado mecánico RGB para gaming y escritura rápida.'
          },
          {
            codigo: 'PROD-002',
            nombre: 'Mouse gamer RGB',
            precio: 25000,
            stock: 5,
            categoria: 'Periféricos',
            descripcion: 'Mouse ergonómico con sensor óptico de alta precisión.'
          },
          {
            codigo: 'PROD-003',
            nombre: 'Monitor 24" 144Hz',
            precio: 180000,
            stock: 3,
            categoria: 'Monitores',
            descripcion: 'Monitor gamer Full HD con tasa de refresco de 144Hz.'
          }
        ]);
        logger.info('[MongoDB] Datos iniciales sembrados correctamente.');
      }
    }
  } catch (error) {
    logger.error(`[MongoDB] Error al sembrar datos iniciales: ${error.message}`);
  }
}

function esObjectIdValido(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

async function buscarProductoPorIdOCodigo(id) {
  if (esObjectIdValido(id)) {
    return await Producto.findById(id);
  }
  return await Producto.findOne({ codigo: id.toUpperCase() });
}

// ==========================================
// ENDPOINTS DE LA API
// ==========================================

// GET /api — Estado de la API y Raft
router.get('/', (req, res) => {
  res.json({
    estado: 'API Distribuida en línea (TP4 Raft Consensus)',
    nodo: raftNode.getStatus(),
    mongoConectado: getIsMongoConnected(),
    redisConectado: getIsRedisConnected(),
    timestamp: new Date().toISOString()
  });
});

// GET /api/accesorios (Lecturas locales - Hito 1/5)
router.get('/accesorios', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json({ status: 200, data: productos });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar productos' });
  }
});

// GET /api/accesorios/:id
router.get('/accesorios/:id', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  try {
    const { id } = req.params;
    const producto = await buscarProductoPorIdOCodigo(id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ status: 200, data: producto });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar producto' });
  }
});

// POST /api/accesorios (Integrado con Raft - Hito 5)
router.post('/accesorios', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { codigo, nombre, precio, stock, categoria, descripcion } = req.body;
  const nuevoData = {
    codigo: codigo || `PROD-${Date.now()}`,
    nombre,
    precio,
    stock,
    categoria,
    descripcion
  };

  const raftResult = await proponerConsensoORechazar(res, {
    action: 'CREATE_PRODUCTO',
    data: nuevoData
  });

  if (!raftResult) return;

  res.status(201).json({ status: 201, mensaje: 'Creado y verificado por mayoría Raft', raft: raftResult });
});

// PUT /api/accesorios/:id
router.put('/accesorios/:id', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { id } = req.params;

  const raftResult = await proponerConsensoORechazar(res, {
    action: 'UPDATE_PRODUCTO',
    id,
    data: req.body
  });

  if (!raftResult) return;

  res.json({ status: 200, mensaje: 'Actualizado por consenso Raft', raft: raftResult });
});

// DELETE /api/accesorios/:id
router.delete('/accesorios/:id', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { id } = req.params;

  const raftResult = await proponerConsensoORechazar(res, {
    action: 'DELETE_PRODUCTO',
    id
  });

  if (!raftResult) return;

  res.json({ status: 200, mensaje: 'Eliminado por consenso Raft', raft: raftResult });
});

// GET /api/productos — Lectura local del nodo (Hito 5)
router.get('/productos', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  try {
    let productos = await Producto.find().sort({ createdAt: -1 });
    if (productos.length === 0) {
      await sembrarDatosIniciales();
      productos = await Producto.find().sort({ createdAt: -1 });
    }
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error interno de persistencia' });
  }
});

// GET /api/productos/:id
router.get('/productos/:id', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { id } = req.params;
  try {
    const producto = await buscarProductoPorIdOCodigo(id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/productos — Crear producto mediante consenso Raft (Hito 5)
router.post('/productos', async (req, res) => {
  if (!verificarConexionMongo(res)) return;

  const { codigo, nombre, precio, stock, categoria, descripcion } = req.body;
  const nuevoData = {
    codigo: codigo || `PROD-${Date.now().toString().slice(-4)}`,
    nombre,
    precio,
    stock,
    categoria,
    descripcion
  };

  const raftResult = await proponerConsensoORechazar(res, {
    action: 'CREATE_PRODUCTO',
    data: nuevoData
  });

  if (!raftResult) return;

  res.status(201).json({
    mensaje: 'Producto creado y confirmado por quórum de mayoría en Raft',
    index: raftResult.index,
    term: raftResult.term,
    data: raftResult.data
  });
});

// PUT /api/productos/:id — Modificar producto mediante consenso Raft (Hito 5)
router.put('/productos/:id', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { id } = req.params;

  const raftResult = await proponerConsensoORechazar(res, {
    action: 'UPDATE_PRODUCTO',
    id,
    data: req.body
  });

  if (!raftResult) return;

  res.json({
    mensaje: 'Producto actualizado y confirmado por quórum en Raft',
    index: raftResult.index,
    term: raftResult.term
  });
});

// DELETE /api/productos/:id — Eliminar producto mediante consenso Raft (Hito 5)
router.delete('/productos/:id', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { id } = req.params;

  const raftResult = await proponerConsensoORechazar(res, {
    action: 'DELETE_PRODUCTO',
    id
  });

  if (!raftResult) return;

  res.json({
    mensaje: 'Producto eliminado y confirmado por quórum en Raft',
    index: raftResult.index,
    term: raftResult.term
  });
});

// POST /api/productos/:id/reservar — Exclusión Mutua con Redis Lock + Consenso Raft (Hito 6.1)
router.post('/productos/:id/reservar', async (req, res) => {
  if (!verificarConexionMongo(res)) return;
  const { id } = req.params;
  const useLock = req.query.useLock !== 'false' && req.headers['x-use-lock'] !== 'false';

  const lockKey = `lock:producto:${id}`;
  const token = crypto.randomUUID();

  if (useLock) {
    const lockAcquired = await acquireLock(lockKey, token, 5000);
    if (!lockAcquired) {
      return res.status(423).json({
        error: 'Recurso bloqueado por otra operación en Redis Lock',
        lockKey
      });
    }
  }

  try {
    const raftResult = await proponerConsensoORechazar(res, {
      action: 'RESERVAR_STOCK',
      id
    });

    if (!raftResult) return;

    res.status(200).json({
      mensaje: 'Reserva realizada con éxito: Lock Redis (Exclusión Mutua) + Raft (Consenso por Mayoría)',
      index: raftResult.index,
      term: raftResult.term
    });
  } finally {
    if (useLock) {
      await releaseLock(lockKey, token);
    }
  }
});

export default router;
