import Product from '../models/Product.js';
import logger from '../utils/logger.js';

export class CatalogService {
  static async listProducts({ categoria, soloActivos = true }) {
    const filter = {};
    if (soloActivos) {
      filter.activo = true;
    }
    if (categoria) {
      filter.categoria = new RegExp(`^${categoria}$`, 'i');
    }
    return await Product.find(filter).sort({ codigo: 1 });
  }

  static async getProductByCode(code) {
    if (!code) return null;
    return await Product.findOne({ codigo: code.toUpperCase() });
  }

  static async createProduct(data) {
    const { codigo, nombre, precio, categoria, descripcion } = data;
    const normalizedCode = codigo.trim().toUpperCase();

    const existing = await Product.findOne({ codigo: normalizedCode });
    if (existing) {
      const error = new Error(`El código de producto ${normalizedCode} ya existe.`);
      error.statusCode = 409;
      throw error;
    }

    const product = new Product({
      codigo: normalizedCode,
      nombre: nombre.trim(),
      precio: Number(precio),
      categoria: categoria ? categoria.trim() : 'Otros',
      descripcion: descripcion ? descripcion.trim() : '',
      activo: true
    });

    return await product.save();
  }

  static async updateProduct(code, data) {
    const normalizedCode = code.trim().toUpperCase();
    const product = await Product.findOne({ codigo: normalizedCode });

    if (!product) {
      const error = new Error(`Producto con código ${normalizedCode} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    if (data.nombre !== undefined) product.nombre = data.nombre.trim();
    if (data.precio !== undefined) product.precio = Number(data.precio);
    if (data.categoria !== undefined) product.categoria = data.categoria.trim();
    if (data.descripcion !== undefined) product.descripcion = data.descripcion.trim();
    if (data.activo !== undefined) product.activo = Boolean(data.activo);

    return await product.save();
  }

  static async deleteProduct(code) {
    const normalizedCode = code.trim().toUpperCase();
    const product = await Product.findOne({ codigo: normalizedCode });

    if (!product) {
      const error = new Error(`Producto con código ${normalizedCode} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    // Soft delete para mantener integridad histórica de órdenes
    product.activo = false;
    await product.save();
    return { mensaje: `Producto ${normalizedCode} dado de baja lógicamente (activo: false).` };
  }

  static async getCategories() {
    return await Product.distinct('categoria', { activo: true });
  }

  static async seedInitialData() {
    try {
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.create([
          {
            codigo: 'PROD-001',
            nombre: 'Teclado mecánico RGB',
            precio: 45000,
            categoria: 'Periféricos',
            descripcion: 'Teclado mecánico con switches táctiles e iluminación RGB.'
          },
          {
            codigo: 'PROD-002',
            nombre: 'Mouse gamer 16000 DPI',
            precio: 25000,
            categoria: 'Periféricos',
            descripcion: 'Mouse óptico ergonómico ultraligero.'
          },
          {
            codigo: 'PROD-003',
            nombre: 'Monitor 24" IPS 144Hz',
            precio: 180000,
            categoria: 'Monitores',
            descripcion: 'Monitor gamer Full HD 1ms FreeSync.'
          }
        ]);
        logger.info('[CatalogService] Semillero inicial de catálogo cargado exitosamente.');
      }
    } catch (err) {
      logger.error(`[CatalogService] Error sembrando catálogo inicial: ${err.message}`);
    }
  }
}
