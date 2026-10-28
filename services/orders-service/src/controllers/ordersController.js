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

// Verifica si el usuario autenticado es dueño del recurso o administrador (Consigna 11.2)
function esDuenioOAdmin(user, customerId) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const matchEmail = user.email && user.email.toLowerCase() === String(customerId).toLowerCase();
  const matchUser = user.username && user.username.toLowerCase() === String(customerId).toLowerCase();
  const matchSub = user.sub && String(user.sub) === String(customerId);
  return Boolean(matchEmail || matchUser || matchSub);
}

export class OrdersController {
  static async create(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      let { customer_id, items } = req.body;

      // Si no envía customer_id o es USER, se asocia por defecto a su identidad autenticada
      if (req.user && req.user.role !== 'ADMIN') {
        customer_id = req.user.email || req.user.username || req.user.sub;
      } else if (!customer_id && req.user) {
        customer_id = req.user.email || req.user.username || req.user.sub;
      }

      // Propagación de token JWT al servicio de inventario (Consigna 13)
      const token = req.token;
      const order = await OrdersService.createOrder({ customer_id, items, token });
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

      // Control de autorización por propiedad del recurso (Consigna 11.2)
      if (!esDuenioOAdmin(req.user, order.customer_id)) {
        logger.warn(
          `[Orders RBAC] 403 Forbidden: Usuario '${req.user?.email}' intentó acceder a la orden '${order_id}' de otro cliente ('${order.customer_id}')`
        );
        return res.status(403).json({
          service: 'orders-service',
          error: 'Forbidden',
          message: 'Acceso denegado: no posee autorización para consultar órdenes pertenecientes a otro usuario.',
          statusCode: 403
        });
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

      // Control de autorización por propiedad del recurso (Consigna 11.2)
      if (!esDuenioOAdmin(req.user, customer_id)) {
        logger.warn(
          `[Orders RBAC] 403 Forbidden: Usuario '${req.user?.email}' intentó consultar el historial del cliente '${customer_id}'`
        );
        return res.status(403).json({
          service: 'orders-service',
          error: 'Forbidden',
          message: 'Acceso denegado: no posee autorización para consultar compras pertenecientes a otro cliente.',
          statusCode: 403
        });
      }

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
      const order = await OrdersService.getOrderById(order_id);
      if (!order) {
        return res.status(404).json({ error: `Orden '${order_id}' no encontrada` });
      }

      if (!esDuenioOAdmin(req.user, order.customer_id)) {
        logger.warn(
          `[Orders RBAC] 403 Forbidden: Usuario '${req.user?.email}' intentó confirmar orden ajena '${order_id}'`
        );
        return res.status(403).json({
          service: 'orders-service',
          error: 'Forbidden',
          message: 'Acceso denegado: no posee permisos para confirmar órdenes de otro usuario.',
          statusCode: 403
        });
      }

      const token = req.token;
      const confirmedOrder = await OrdersService.confirmOrder(order_id, token);
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
      const order = await OrdersService.getOrderById(order_id);
      if (!order) {
        return res.status(404).json({ error: `Orden '${order_id}' no encontrada` });
      }

      if (!esDuenioOAdmin(req.user, order.customer_id)) {
        logger.warn(
          `[Orders RBAC] 403 Forbidden: Usuario '${req.user?.email}' intentó cancelar orden ajena '${order_id}'`
        );
        return res.status(403).json({
          service: 'orders-service',
          error: 'Forbidden',
          message: 'Acceso denegado: no posee permisos para cancelar órdenes de otro usuario.',
          statusCode: 403
        });
      }

      const token = req.token;
      const cancelledOrder = await OrdersService.cancelOrder(order_id, reason, token);
      res.json(cancelledOrder);
    } catch (error) {
      next(error);
    }
  }
}
