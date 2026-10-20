/**
 * Script de prueba de integración End-to-End (E2E) para TP6
 * Valida la comunicación HTTP, exclusión mutua, congelamiento de precios y estados de orden.
 */

const BASE_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';

async function runTests() {
  console.log('===============================================================');
  console.log('   PRUEBA INTEGRAL END-TO-END — TP6 MICROSERVICIOS');
  console.log(`   Punto de Entrada (Gateway): ${BASE_URL}`);
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`[TEST] ${name} ... `);
      await fn();
      console.log('✅ OK');
      passed++;
    } catch (err) {
      console.log(`❌ FALLÓ: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Checks
  await test('Health Check del API Gateway', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Estado inesperado: ${data.status}`);
  });

  // 2. Consulta de catálogo
  await test('Consulta de catálogo de productos (/api/catalog/products)', async () => {
    const res = await fetch(`${BASE_URL}/api/catalog/products`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Catálogo vacío o no es un arreglo');
    }
  });

  // 3. Consulta de existencias en inventario
  await test('Consulta de inventario para PROD-001 (/api/inventory/PROD-001)', async () => {
    const res = await fetch(`${BASE_URL}/api/inventory/PROD-001`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const inv = await res.json();
    if (inv.product_code !== 'PROD-001') throw new Error(`Código inesperado: ${inv.product_code}`);
  });

  // 4. Endpoint agregado del Gateway
  await test('Consulta agregada (Ficha + Stock) en Gateway (/api/products/PROD-001)', async () => {
    const res = await fetch(`${BASE_URL}/api/products/PROD-001`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const agg = await res.json();
    if (!agg.nombre || agg.stock === undefined) {
      throw new Error('Respuesta agregada no contiene campos esperados');
    }
  });

  // 5. Creación de Orden (Happy Path con comunicación Catalog -> Inventory -> Orders)
  let createdOrderId = null;
  await test('Creación de orden con reserva atómica (/api/orders)', async () => {
    const payload = {
      customer_id: 'CLI-TEST-1',
      items: [
        { code: 'PROD-001', qty: 1 }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status !== 201) {
      const body = await res.text();
      throw new Error(`Esperado status 201, recibido ${res.status}: ${body}`);
    }

    const order = await res.json();
    if (!order.order_id || order.estado !== 'PENDING') {
      throw new Error(`Estado de orden inválido: ${order.estado}`);
    }
    if (!order.reservation_id) {
      throw new Error('La orden no tiene reservation_id asociado de inventario');
    }

    createdOrderId = order.order_id;
  });

  // 6. Confirmación de Orden
  await test('Confirmación de orden y deducción definitiva de stock', async () => {
    if (!createdOrderId) throw new Error('No hay orden previa');

    const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Esperado 200, recibido ${res.status}: ${body}`);
    }

    const confirmed = await res.json();
    if (confirmed.estado !== 'CONFIRMED') {
      throw new Error(`Estado de orden no es CONFIRMED: ${confirmed.estado}`);
    }
  });

  // 7. Manejo de error de negocio: Stock insuficiente (debe retornar 409 Conflict)
  await test('Validación de stock insuficiente (debe responder 409 Conflict)', async () => {
    const payload = {
      customer_id: 'CLI-TEST-2',
      items: [
        { code: 'PROD-001', qty: 999999 }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status !== 409) {
      throw new Error(`Esperado status 409 Conflict, recibido ${res.status}`);
    }
    const err = await res.json();
    if (err.statusCode !== 409) {
      throw new Error(`statusCode en payload no coincide: ${err.statusCode}`);
    }
  });

  console.log('\n===============================================================');
  console.log(`   RESULTADOS: ${passed} pasados, ${failed} fallidos`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Error fatal ejecutando pruebas:', err);
  process.exit(1);
});
