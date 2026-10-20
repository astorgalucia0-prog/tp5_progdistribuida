import { CatalogService } from '../services/catalogService.js';
import { getIsMongoConnected } from '../database.js';
import logger from '../utils/logger.js';

function verificarPersistencia(res) {
  if (!getIsMongoConnected()) {
    logger.warn('[Catalog] Petición rechazada: Base de datos MongoDB no disponible.');
    res.status(503).json({
      error: 'Servicio de persistencia no disponible',
      mensaje: 'La base de datos db_catalog no se encuentra disponible.'
    });
    return false;
  }
  return true;
}

export class CatalogController {
  static async list(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { categoria, todos } = req.query;
      const soloActivos = todos !== 'true';
      const products = await CatalogService.listProducts({ categoria, soloActivos });
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  static async getByCode(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { code } = req.params;
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({ error: 'Código de producto inválido' });
      }

      const product = await CatalogService.getProductByCode(code);
      if (!product) {
        return res.status(404).json({ error: `Producto con código '${code}' no encontrado.` });
      }

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { codigo, nombre, precio, categoria, descripcion } = req.body;

      if (!codigo || !nombre || precio === undefined || precio === null) {
        return res.status(400).json({
          error: 'Datos incompletos',
          mensaje: 'Los campos codigo, nombre y precio son obligatorios.'
        });
      }

      if (Number(precio) < 0) {
        return res.status(400).json({
          error: 'Precio inválido',
          mensaje: 'El precio debe ser un número mayor o igual a 0.'
        });
      }

      const product = await CatalogService.createProduct({
        codigo,
        nombre,
        precio,
        categoria,
        descripcion
      });

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { code } = req.params;
      const product = await CatalogService.updateProduct(code, req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { code } = req.params;
      const result = await CatalogService.deleteProduct(code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const categories = await CatalogService.getCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }
}
