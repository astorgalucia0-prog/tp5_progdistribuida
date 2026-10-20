import { OrdersService } from '../services/ordersService.js';
import { getIsMongoConnected } from '../database.js';
import logger from '../utils/logger.js';

function verificarPersistencia(res) {
  if (!getIsMongoConnected()) {
    logger.warn('[Orders] Petición rechazada: Base de datos MongoDB no disponible.');
    res.status(503).json({
      error: 'Servicio de persistencia no disponible',
      mensaje: 'La base de datos db_orders no se encuentra disponible.'
    });
    return false;
  }
  return true;
}

export class OrdersController {
  static async create(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { customer_id, items } = req.body;
      const order = await OrdersService.createOrder({ customer_id, items });
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { order_id } = req.params;
      const order = await OrdersService.getOrderById(order_id);
      if (!order) {
        return res.status(404).json({ error: `Orden '${order_id}' no encontrada` });
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  static async getByCustomer(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { customer_id } = req.params;
      const orders = await OrdersService.getOrdersByCustomer(customer_id);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { order_id } = req.params;
      const confirmedOrder = await OrdersService.confirmOrder(order_id);
      res.json(confirmedOrder);
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { order_id } = req.params;
      const { reason } = req.body;
      const cancelledOrder = await OrdersService.cancelOrder(order_id, reason);
      res.json(cancelledOrder);
    } catch (error) {
      next(error);
    }
  }
}
