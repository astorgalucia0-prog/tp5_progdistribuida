import crypto from 'node:crypto';
import Order from '../models/Order.js';
import { CatalogClient } from '../clients/catalogClient.js';
import { InventoryClient } from '../clients/inventoryClient.js';
import logger from '../utils/logger.js';

export class OrdersService {
  static async createOrder({ customer_id, items, token }) {
    if (!customer_id || typeof customer_id !== 'string') {
      const error = new Error('customer_id es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const error = new Error('La orden debe contener una lista no vacía de items');
      error.statusCode = 400;
      throw error;
    }

    const orderId = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    logger.info(`[OrdersService] Procesando creación de orden ${orderId} para cliente ${customer_id}`);

    // 1. Paso 1: Consultar precios y catálogo para cada artículo
    const orderItems = [];
    let grandTotal = 0;

    for (const item of items) {
      const code = (item.code || item.product_code || '').trim().toUpperCase();
      const qty = parseInt(item.qty || item.cantidad, 10);

      if (!code || isNaN(qty) || qty <= 0) {
        const error = new Error(`Ítem inválido en orden: code='${code}', qty=${qty}`);
        error.statusCode = 400;
        throw error;
      }

      // Consulta a Catalog Service (aplica timeout y categorización de errores)
      const catalogProduct = await CatalogClient.getProductByCode(code);

      const unitPrice = Number(catalogProduct.precio);
      const subtotal = unitPrice * qty;
      grandTotal += subtotal;

      orderItems.push({
        product_code: code,
        nombre: catalogProduct.nombre,
        cantidad: qty,
        precio_unitario: unitPrice,
        subtotal
      });
    }

    // 2. Paso 2: Solicitar reserva temporal en Inventory Service (propagando JWT si existe)
    let reservationResult = null;
    try {
      reservationResult = await InventoryClient.reserve({
        order_id: orderId,
        items: orderItems.map((i) => ({ code: i.product_code, qty: i.cantidad })),
        token
      });
    } catch (reserveError) {
      // Si la reserva falla por falta de stock (409), registramos la orden como REJECTED
      if (reserveError.statusCode === 409) {
        logger.warn(`[OrdersService] Orden ${orderId} rechazada por falta de stock en Inventory`);
        const rejectedOrder = new Order({
          order_id: orderId,
          customer_id,
          items: orderItems,
          total: grandTotal,
          reservation_id: null,
          estado: 'REJECTED_OUT_OF_STOCK'
        });
        await rejectedOrder.save();

        reserveError.order_id = orderId;
      }
      throw reserveError;
    }

    // 3. Paso 3: Persistir orden en estado PENDING con su reservation_id
    const order = new Order({
      order_id: orderId,
      customer_id,
      items: orderItems,
      total: grandTotal,
      reservation_id: reservationResult.reservation_id,
      estado: 'PENDING'
    });

    const savedOrder = await order.save();
    logger.info(`[OrdersService] Orden ${orderId} creada exitosamente con estado PENDING.`);
    return savedOrder;
  }

  static async getOrderById(orderId) {
    if (!orderId) return null;
    return await Order.findOne({ order_id: orderId.trim() });
  }

  static async getOrdersByCustomer(customerId) {
    if (!customerId) return [];
    return await Order.find({ customer_id: customerId.trim() }).sort({ createdAt: -1 });
  }

  static async confirmOrder(orderId, token) {
    const order = await Order.findOne({ order_id: orderId.trim() });
    if (!order) {
      const error = new Error(`Orden ${orderId} no encontrada`);
      error.statusCode = 404;
      throw error;
    }

    if (order.estado !== 'PENDING') {
      const error = new Error(`No se puede confirmar la orden ${orderId} porque se encuentra en estado '${order.estado}'`);
      error.statusCode = 400;
      throw error;
    }

    // Confirmar la reserva en Inventory Service propagando token
    await InventoryClient.confirm({
      reservation_id: order.reservation_id,
      order_id: order.order_id,
      token
    });

    order.estado = 'CONFIRMED';
    const updated = await order.save();
    logger.info(`[OrdersService] Orden ${orderId} confirmada exitosamente.`);
    return updated;
  }

  static async cancelOrder(orderId, reason = 'USER_CANCELLED', token) {
    const order = await Order.findOne({ order_id: orderId.trim() });
    if (!order) {
      const error = new Error(`Orden ${orderId} no encontrada`);
      error.statusCode = 404;
      throw error;
    }

    if (order.estado !== 'PENDING') {
      const error = new Error(`No se puede cancelar la orden ${orderId} porque su estado es '${order.estado}'`);
      error.statusCode = 400;
      throw error;
    }

    // Liberar la reserva en Inventory Service propagando token
    if (order.reservation_id) {
      await InventoryClient.release({
        reservation_id: order.reservation_id,
        reason,
        token
      });
    }

    order.estado = 'CANCELLED';
    const updated = await order.save();
    logger.info(`[OrdersService] Orden ${orderId} cancelada.`);
    return updated;
  }
}
