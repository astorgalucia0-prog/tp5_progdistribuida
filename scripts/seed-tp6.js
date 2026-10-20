/**
 * Script de inicialización de datos de prueba reproducibles (Seed TP6)
 * Permite restaurar el catálogo y el inventario a un estado inicial conocido.
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || `${GATEWAY_URL}/api/catalog`;
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || `${GATEWAY_URL}/api/inventory`;

const INITIAL_PRODUCTS = [
  {
    codigo: 'PROD-001',
    nombre: 'Teclado mecánico RGB',
    precio: 45000,
    categoria: 'Periféricos',
    descripcion: 'Teclado mecánico switches táctiles retroiluminado RGB',
    stock_inicial: 10
  },
  {
    codigo: 'PROD-002',
    nombre: 'Mouse gamer 16000 DPI',
    precio: 25000,
    categoria: 'Periféricos',
    descripcion: 'Mouse óptico ultraliviano con sensor óptico de alta precisión',
    stock_inicial: 5
  },
  {
    codigo: 'PROD-003',
    nombre: 'Monitor 24" IPS 144Hz',
    precio: 180000,
    categoria: 'Monitores',
    descripcion: 'Monitor gamer Full HD 1ms FreeSync',
    stock_inicial: 3
  },
  {
    codigo: 'PROD-004',
    nombre: 'Auriculares Inalámbricos Pro',
    precio: 35000,
    categoria: 'Audio',
    descripcion: 'Auriculares Bluetooth con cancelación activa de ruido',
    stock_inicial: 15
  }
];

async function seed() {
  console.log('===============================================================');
  console.log('   INICIALIZACIÓN DE DATOS DE PRUEBA REPRODUCIBLES — TP6');
  console.log('===============================================================\n');

  for (const item of INITIAL_PRODUCTS) {
    console.log(`[Seed] Procesando artículo: ${item.codigo} (${item.nombre})`);

    // 1. Alta o actualización en Catalog Service
    try {
      const catRes = await fetch(`${CATALOG_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: item.codigo,
          nombre: item.nombre,
          precio: item.precio,
          categoria: item.categoria,
          descripcion: item.descripcion
        })
      });

      if (catRes.status === 201) {
        console.log(`  -> Catálogo: Producto ${item.codigo} creado.`);
      } else if (catRes.status === 409) {
        console.log(`  -> Catálogo: Producto ${item.codigo} ya existía.`);
      } else {
        console.warn(`  -> Catálogo respuesta: ${catRes.status}`);
      }
    } catch (e) {
      console.error(`  -> Error comunicando con Catálogo: ${e.message}`);
    }

    // 2. Ajuste de stock en Inventory Service
    try {
      const invRes = await fetch(`${INVENTORY_URL}/${item.codigo}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_total: item.stock_inicial
        })
      });

      if (invRes.ok) {
        console.log(`  -> Inventario: Stock fijado en ${item.stock_inicial} unidades.`);
      } else {
        console.warn(`  -> Inventario respuesta: ${invRes.status}`);
      }
    } catch (e) {
      console.error(`  -> Error comunicando con Inventario: ${e.message}`);
    }
  }

  console.log('\n[Seed] Carga de datos iniciales finalizada con éxito.');
}

seed().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
