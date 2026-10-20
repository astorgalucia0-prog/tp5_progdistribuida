import crypto from 'node:crypto';
import Inventory from '../models/Inventory.js';
import { acquireLock, releaseLock } from '../redis.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class InventoryService {
  static async getAvailability(productCode) {
    const code = productCode.trim().toUpperCase();
    const inv = await Inventory.findOne({ product_code: code });
    if (!inv) return null;

    return {
      product_code: inv.product_code,
      stock_total: inv.stock_total,
      stock_disponible: inv.stock_disponible,
      stock_reservado: inv.stock_reservado,
      disponible_para_venta: inv.stock_disponible > 0
    };
  }

  static async adjustStock(productCode, { stock_total, delta }) {
    const code = productCode.trim().toUpperCase();
    let inv = await Inventory.findOne({ product_code: code });

    if (!inv) {
      const initialTotal = stock_total !== undefined ? Number(stock_total) : (delta !== undefined ? Math.max(0, Number(delta)) : 0);
      inv = new Inventory({
        product_code: code,
        stock_total: initialTotal,
        stock_disponible: initialTotal,
        stock_reservado: 0,
        reservas: []
      });
      return await inv.save();
    }

    if (stock_total !== undefined) {
      const newTotal = Number(stock_total);
      if (newTotal < inv.stock_reservado) {
        const error = new Error(`El nuevo stock total (${newTotal}) no puede ser menor al stock reservado actual (${inv.stock_reservado}).`);
        error.statusCode = 400;
        throw error;
      }
      inv.stock_total = newTotal;
      inv.stock_disponible = newTotal - inv.stock_reservado;
    } else if (delta !== undefined) {
      const adjustment = Number(delta);
      if (inv.stock_disponible + adjustment < 0) {
        const error = new Error(`El ajuste de stock resulta en stock disponible negativo.`);
        error.statusCode = 400;
        throw error;
      }
      inv.stock_total += adjustment;
      inv.stock_disponible += adjustment;
    }

    return await inv.save();
  }

  static async reserveStock({ order_id, items }) {
    if (!order_id || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Parámetros de reserva inválidos: se requiere order_id y lista de items.');
      error.statusCode = 400;
      throw error;
    }

    const reservationId = `RES-${crypto.randomUUID()}`;
    const token = crypto.randomUUID();
    const acquiredLocks = [];

    try {
      // 1. Adquirir locks en Redis para cada código de producto involucrado
      for (const item of items) {
        const code = item.code.trim().toUpperCase();
        const lockKey = `lock:inventory:${code}`;
        const acquired = await acquireLock(lockKey, token, config.lockTtlMs);
        if (!acquired) {
          const error = new Error(`Recurso bloqueado concurrentemente para producto: ${code}`);
          error.statusCode = 423; // Locked
          throw error;
        }
        acquiredLocks.push(lockKey);
      }

      // 2. Validar disponibilidad atómica de todos los ítems (política All-or-Nothing)
      const inventoryDocs = [];
      for (const item of items) {
        const code = item.code.trim().toUpperCase();
        const qty = parseInt(item.qty, 10);

        if (!qty || qty <= 0) {
          const error = new Error(`Cantidad inválida para producto ${code}: ${item.qty}`);
          error.statusCode = 400;
          throw error;
        }

        const inv = await Inventory.findOne({ product_code: code });
        if (!inv) {
          const error = new Error(`El producto ${code} no existe en inventario.`);
          error.statusCode = 404;
          throw error;
        }

        if (inv.stock_disponible < qty) {
          const error = new Error(`Stock insuficiente para producto ${code}. Disponible: ${inv.stock_disponible}, Solicitado: ${qty}`);
          error.statusCode = 409;
          error.code = 'INSUFFICIENT_STOCK';
          error.product_code = code;
          error.disponible = inv.stock_disponible;
          error.requerido = qty;
          throw error;
        }

        inventoryDocs.push({ inv, qty });
      }

      // 3. Aplicar la reserva en cada documento
      const expiraAt = new Date(Date.now() + config.reservationTtlSeconds * 1000);

      for (const { inv, qty } of inventoryDocs) {
        inv.stock_disponible -= qty;
        inv.stock_reservado += qty;
        inv.reservas.push({
          reservation_id: reservationId,
          order_id: String(order_id),
          cantidad: qty,
          expira_at: expiraAt,
          estado: 'RESERVED'
        });
        await inv.save();
      }

      logger.info(`[InventoryService] Reserva ${reservationId} completada para orden ${order_id}.`);

      return {
        reservation_id: reservationId,
        order_id,
        status: 'RESERVED',
        items: items.map(i => ({ code: i.code.toUpperCase(), qty: i.qty })),
        expira_at: expiraAt.toISOString()
      };
    } finally {
      // Liberar todos los locks adquiridos
      for (const lockKey of acquiredLocks) {
        await releaseLock(lockKey, token);
      }
    }
  }

  static async confirmReservation({ reservation_id, order_id }) {
    if (!reservation_id) {
      const error = new Error('Se requiere reservation_id');
      error.statusCode = 400;
      throw error;
    }

    const itemsWithReservation = await Inventory.find({
      'reservas.reservation_id': reservation_id,
      'reservas.estado': 'RESERVED'
    });

    if (!itemsWithReservation || itemsWithReservation.length === 0) {
      const error = new Error(`No se encontró reserva activa con ID: ${reservation_id}`);
      error.statusCode = 404;
      throw error;
    }

    for (const inv of itemsWithReservation) {
      const reserva = inv.reservas.find(r => r.reservation_id === reservation_id && r.estado === 'RESERVED');
      if (reserva) {
        inv.stock_reservado -= reserva.cantidad;
        inv.stock_total -= reserva.cantidad;
        reserva.estado = 'CONFIRMED';
        await inv.save();
      }
    }

    logger.info(`[InventoryService] Reserva ${reservation_id} confirmada definitivamente.`);
    return {
      status: 'CONFIRMED',
      reservation_id,
      order_id,
      stock_deducted: true
    };
  }

  static async releaseReservation({ reservation_id, reason = 'CANCELLED' }) {
    if (!reservation_id) {
      const error = new Error('Se requiere reservation_id');
      error.statusCode = 400;
      throw error;
    }

    const itemsWithReservation = await Inventory.find({
      'reservas.reservation_id': reservation_id,
      'reservas.estado': 'RESERVED'
    });

    if (!itemsWithReservation || itemsWithReservation.length === 0) {
      const error = new Error(`No se encontró reserva activa con ID: ${reservation_id}`);
      error.statusCode = 404;
      throw error;
    }

    for (const inv of itemsWithReservation) {
      const reserva = inv.reservas.find(r => r.reservation_id === reservation_id && r.estado === 'RESERVED');
      if (reserva) {
        inv.stock_reservado -= reserva.cantidad;
        inv.stock_disponible += reserva.cantidad;
        reserva.estado = 'RELEASED';
        await inv.save();
      }
    }

    logger.info(`[InventoryService] Reserva ${reservation_id} liberada. Motivo: ${reason}`);
    return {
      status: 'RELEASED',
      reservation_id,
      reason
    };
  }

  static async seedInitialData() {
    try {
      const count = await Inventory.countDocuments();
      if (count === 0) {
        await Inventory.create([
          {
            product_code: 'PROD-001',
            stock_total: 10,
            stock_disponible: 10,
            stock_reservado: 0,
            reservas: []
          },
          {
            product_code: 'PROD-002',
            stock_total: 5,
            stock_disponible: 5,
            stock_reservado: 0,
            reservas: []
          },
          {
            product_code: 'PROD-003',
            stock_total: 3,
            stock_disponible: 3,
            stock_reservado: 0,
            reservas: []
          }
        ]);
        logger.info('[InventoryService] Semillero inicial de inventario cargado exitosamente.');
      }
    } catch (err) {
      logger.error(`[InventoryService] Error sembrando inventario inicial: ${err.message}`);
    }
  }
}
