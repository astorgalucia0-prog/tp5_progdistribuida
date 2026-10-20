import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class InventoryClient {
  static async reserve({ order_id, items }) {
    const url = `${config.inventoryServiceUrl}/api/inventory/reserve`;

    logger.info(`[InventoryClient] Solicitando reserva para orden ${order_id} en: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ order_id, items }),
        signal: AbortSignal.timeout(config.requestTimeoutMs)
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        // Conflicto de negocio: Stock insuficiente
        logger.warn(`[InventoryClient] Stock insuficiente para orden ${order_id}: ${data.message || data.error}`);
        const error = new Error(data.message || 'Stock insuficiente para satisfacer el pedido.');
        error.statusCode = 409;
        error.code = 'INSUFFICIENT_STOCK';
        error.details = data;
        error.remoteService = 'inventory-service';
        throw error;
      }

      if (response.status === 423) {
        // Concurrencia: Recurso bloqueado
        logger.warn(`[InventoryClient] Concurrencia / Lock activo en Inventory para orden ${order_id}`);
        const error = new Error('Recurso temporalmente bloqueado por otra operación en curso. Intente nuevamente.');
        error.statusCode = 423;
        error.remoteService = 'inventory-service';
        throw error;
      }

      if (response.status === 404) {
        logger.warn(`[InventoryClient] Producto no encontrado en inventario para orden ${order_id}: ${data.message || data.error}`);
        const error = new Error(data.message || 'Producto no registrado en inventario.');
        error.statusCode = 404;
        error.remoteService = 'inventory-service';
        throw error;
      }

      if (!response.ok) {
        logger.error(`[InventoryClient] Error en Inventory Service (${response.status}): ${JSON.stringify(data)}`);
        const error = new Error(data.message || `Fallo en Inventory Service (${response.statusText})`);
        error.statusCode = 502;
        error.remoteService = 'inventory-service';
        throw error;
      }

      return data;
    } catch (err) {
      if (err.statusCode) {
        throw err;
      }

      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const cause = isTimeout ? 'Timeout al consultar inventario' : `Fallo de conexión (${err.message})`;

      logger.error(`[InventoryClient] INDISPONIBILIDAD de Inventory Service (${config.inventoryServiceUrl}): ${cause}`);

      const serviceUnavailableError = new Error(
        `Inventory Service no se encuentra disponible temporalmente (${cause}).`
      );
      serviceUnavailableError.statusCode = 503;
      serviceUnavailableError.remoteService = 'inventory-service';
      serviceUnavailableError.cause = err;
      throw serviceUnavailableError;
    }
  }

  static async confirm({ reservation_id, order_id }) {
    const url = `${config.inventoryServiceUrl}/api/inventory/confirm`;

    logger.info(`[InventoryClient] Confirmando reserva ${reservation_id} en: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ reservation_id, order_id }),
        signal: AbortSignal.timeout(config.requestTimeoutMs)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || 'Error al confirmar reserva en inventario.');
        error.statusCode = response.status === 404 ? 404 : 502;
        error.remoteService = 'inventory-service';
        throw error;
      }

      return data;
    } catch (err) {
      if (err.statusCode) throw err;

      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const cause = isTimeout ? 'Timeout al confirmar inventario' : `Fallo de conexión (${err.message})`;

      logger.error(`[InventoryClient] INDISPONIBILIDAD de Inventory Service al confirmar: ${cause}`);
      const serviceUnavailableError = new Error(`Inventory Service no se encuentra disponible temporalmente (${cause}).`);
      serviceUnavailableError.statusCode = 503;
      serviceUnavailableError.remoteService = 'inventory-service';
      throw serviceUnavailableError;
    }
  }

  static async release({ reservation_id, reason }) {
    const url = `${config.inventoryServiceUrl}/api/inventory/release`;

    logger.info(`[InventoryClient] Liberando reserva ${reservation_id} en: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ reservation_id, reason }),
        signal: AbortSignal.timeout(config.requestTimeoutMs)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || 'Error al liberar reserva en inventario.');
        error.statusCode = response.status === 404 ? 404 : 502;
        error.remoteService = 'inventory-service';
        throw error;
      }

      return data;
    } catch (err) {
      if (err.statusCode) throw err;

      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const cause = isTimeout ? 'Timeout al liberar reserva' : `Fallo de conexión (${err.message})`;

      logger.error(`[InventoryClient] INDISPONIBILIDAD de Inventory Service al liberar reserva: ${cause}`);
      const serviceUnavailableError = new Error(`Inventory Service no se encuentra disponible temporalmente (${cause}).`);
      serviceUnavailableError.statusCode = 503;
      serviceUnavailableError.remoteService = 'inventory-service';
      throw serviceUnavailableError;
    }
  }
}
