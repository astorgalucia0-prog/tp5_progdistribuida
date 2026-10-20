import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class CatalogClient {
  static async getProductByCode(productCode) {
    const code = productCode.trim().toUpperCase();
    const url = `${config.catalogServiceUrl}/api/catalog/products/${code}`;

    logger.info(`[CatalogClient] Consultando producto '${code}' en: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(config.requestTimeoutMs)
      });

      if (response.status === 404) {
        logger.warn(`[CatalogClient] Producto '${code}' no encontrado en Catalog Service (404)`);
        const error = new Error(`El producto '${code}' no existe en el catálogo.`);
        error.statusCode = 404;
        error.remoteService = 'catalog-service';
        throw error;
      }

      if (response.status === 400) {
        logger.warn(`[CatalogClient] Formato de código '${code}' inválido para Catalog Service (400)`);
        const error = new Error(`El código de producto '${code}' es inválido.`);
        error.statusCode = 400;
        error.remoteService = 'catalog-service';
        throw error;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        logger.error(`[CatalogClient] Error remoto desde Catalog Service (${response.status}): ${errorBody}`);
        const error = new Error(`Fallo en Catalog Service: ${response.statusText}`);
        error.statusCode = 502; // Bad Gateway
        error.remoteService = 'catalog-service';
        throw error;
      }

      const product = await response.json();

      if (product.activo === false) {
        logger.warn(`[CatalogClient] El producto '${code}' se encuentra inactivo (dado de baja lógicamente).`);
        const error = new Error(`El producto '${code}' no está disponible para venta (inactivo).`);
        error.statusCode = 400;
        error.remoteService = 'catalog-service';
        throw error;
      }

      return product;
    } catch (err) {
      if (err.statusCode) {
        // Error funcional ya categorizado (400, 404, 502)
        throw err;
      }

      // Falla de red, timeout o DNS hacia catalog-service
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const cause = isTimeout ? 'Timeout al consultar catálogo' : `Fallo de conexión (${err.message})`;

      logger.error(`[CatalogClient] INDISPONIBILIDAD de Catalog Service (${config.catalogServiceUrl}): ${cause}`);

      const serviceUnavailableError = new Error(
        `Catalog Service no se encuentra disponible temporalmente (${cause}).`
      );
      serviceUnavailableError.statusCode = 503;
      serviceUnavailableError.remoteService = 'catalog-service';
      serviceUnavailableError.cause = err;
      throw serviceUnavailableError;
    }
  }
}
