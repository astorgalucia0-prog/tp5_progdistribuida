/**
 * Script de inicialización y sembrado de datos para TP7 (Seguridad y JWT)
 * Autentica como ADMIN y realiza la carga de usuarios, catálogo e inventario.
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const AUTH_URL = process.env.AUTH_SERVICE_URL || `${GATEWAY_URL}/api/auth`;
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || `${GATEWAY_URL}/api/catalog`;
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || `${GATEWAY_URL}/api/inventory`;

const INITIAL_USERS = [
  {
    username: 'admin',
    email: 'admin@uch.edu.ar',
    password: 'AdminPassword123!',
    role: 'ADMIN',
    nombre: 'Administrador del Sistema'
  },
  {
    username: 'cliente1',
    email: 'cliente1@uch.edu.ar',
    password: 'UserPassword123!',
    role: 'USER',
    nombre: 'Lucía Astorga (Cliente)'
  },
  {
    username: 'cliente2',
    email: 'cliente2@uch.edu.ar',
    password: 'UserPassword123!',
    role: 'USER',
    nombre: 'Santiago Militello (Cliente)'
  }
];

const INITIAL_PRODUCTS = [
  {
    codigo: 'PROD-001',
    nombre: 'Teclado mecánico RGB',
    precio: 45000,
    categoria: 'Periféricos',
    descripcion: 'Teclado mecánico switches táctiles retroiluminado RGB',
    stock_inicial: 20
  },
  {
    codigo: 'PROD-002',
    nombre: 'Mouse gamer 16000 DPI',
    precio: 25000,
    categoria: 'Periféricos',
    descripcion: 'Mouse óptico ultraliviano con sensor óptico de alta precisión',
    stock_inicial: 15
  },
  {
    codigo: 'PROD-003',
    nombre: 'Monitor 24" IPS 144Hz',
    precio: 180000,
    categoria: 'Monitores',
    descripcion: 'Monitor gamer Full HD 1ms FreeSync',
    stock_inicial: 10
  },
  {
    codigo: 'PROD-004',
    nombre: 'Auriculares Inalámbricos Pro',
    precio: 35000,
    categoria: 'Audio',
    descripcion: 'Auriculares Bluetooth con cancelación activa de ruido',
    stock_inicial: 25
  }
];

async function seed() {
  console.log('===============================================================');
  console.log('   INICIALIZACIÓN DE IDENTIDADES Y CATÁLOGO AUTENTICADO — TP7');
  console.log(`   Punto de Entrada: ${GATEWAY_URL}`);
  console.log('===============================================================\n');

  // 1. Alta o verificación de usuarios de prueba
  console.log('[1/3] Verificando / Registrando identidades en Auth Service...');
  for (const user of INITIAL_USERS) {
    try {
      const regRes = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (regRes.status === 201) {
        console.log(`  -> Creado usuario: ${user.email} (${user.role})`);
      } else if (regRes.status === 409) {
        console.log(`  -> Usuario ya existente: ${user.email} (${user.role})`);
      } else {
        console.warn(`  -> Registro ${user.email}: Status ${regRes.status}`);
      }
    } catch (e) {
      console.warn(`  -> Aviso al registrar ${user.email}: ${e.message}`);
    }
  }

  // 2. Login como ADMIN para obtener token JWT con privilegios
  console.log('\n[2/3] Obteniendo Access Token JWT con credenciales de Administrador...');
  let adminToken = null;
  try {
    const loginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@uch.edu.ar',
        password: 'AdminPassword123!'
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login admin falló con código ${loginRes.status}`);
    }

    const data = await loginRes.json();
    adminToken = data.token;
    console.log(`  -> Token JWT ADMIN emitido exitosamente. Vigencia: ${data.expiresIn}`);
  } catch (err) {
    console.error(`  -> ERROR obteniendo token ADMIN: ${err.message}`);
    process.exit(1);
  }

  // 3. Sembrado autenticado de catálogo e inventario usando el Token
  console.log('\n[3/3] Sembrando Catálogo e Inventario utilizando Bearer Token...');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  for (const item of INITIAL_PRODUCTS) {
    console.log(`  Procesando: ${item.codigo} (${item.nombre})`);

    // Alta comercial en Catalog Service
    try {
      const catRes = await fetch(`${CATALOG_URL}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          codigo: item.codigo,
          nombre: item.nombre,
          precio: item.precio,
          categoria: item.categoria,
          descripcion: item.descripcion
        })
      });

      if (catRes.status === 201) {
        console.log(`    [Catálogo] Producto ${item.codigo} dado de alta.`);
      } else if (catRes.status === 409) {
        console.log(`    [Catálogo] Producto ${item.codigo} ya existía.`);
      } else {
        console.warn(`    [Catálogo] Status ${catRes.status}`);
      }
    } catch (e) {
      console.error(`    [Catálogo Error] ${e.message}`);
    }

    // Ajuste de stock en Inventory Service
    try {
      const invRes = await fetch(`${INVENTORY_URL}/${item.codigo}/stock`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          stock_total: item.stock_inicial
        })
      });

      if (invRes.ok) {
        console.log(`    [Inventario] Stock fijado en ${item.stock_inicial} unidades.`);
      } else {
        console.warn(`    [Inventario] Status ${invRes.status}`);
      }
    } catch (e) {
      console.error(`    [Inventario Error] ${e.message}`);
    }
  }

  console.log('\n[Seed TP7] ¡Inicialización de datos y seguridad completada con éxito!');
}

seed().catch((err) => {
  console.error('[Seed TP7 Fatal Error]', err);
  process.exit(1);
});
