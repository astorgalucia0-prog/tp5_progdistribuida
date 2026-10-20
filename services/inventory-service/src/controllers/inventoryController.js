import { InventoryService } from '../services/inventoryService.js';
import { getIsMongoConnected } from '../database.js';
import logger from '../utils/logger.js';

function verificarPersistencia(res) {
  if (!getIsMongoConnected()) {
    logger.warn('[Inventory] Petición rechazada: Base de datos MongoDB no disponible.');
    res.status(503).json({
      error: 'Servicio de persistencia no disponible',
      mensaje: 'La base de datos db_inventory no se encuentra disponible.'
    });
    return false;
  }
  return true;
}

export class InventoryController {
  static async getAvailability(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { code } = req.params;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Código de producto inválido' });
      }

      const inv = await InventoryService.getAvailability(code);
      if (!inv) {
        return res.status(404).json({ error: `Producto '${code}' no encontrado en inventario.` });
      }

      res.json(inv);
    } catch (error) {
      next(error);
    }
  }

  static async reserve(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { order_id, items } = req.body;
      const result = await InventoryService.reserveStock({ order_id, items });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { reservation_id, order_id } = req.body;
      const result = await InventoryService.confirmReservation({ reservation_id, order_id });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async release(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { reservation_id, reason } = req.body;
      const result = await InventoryService.releaseReservation({ reservation_id, reason });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { code } = req.params;
      const { stock_total, delta } = req.body;

      if (stock_total === undefined && delta === undefined) {
        return res.status(400).json({ error: 'Debe especificar stock_total o delta para ajustar stock.' });
      }

      const updated = await InventoryService.adjustStock(code, { stock_total, delta });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
}
