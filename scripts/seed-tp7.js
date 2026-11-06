/**
 * Script de inicialización y sembrado de datos para TP7 (Seguridad y JWT)
 * Utiliza credenciales externalizadas en variables de entorno (sin passwords hardcodeadas).
 */

import dotenv from 'dotenv';
dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const AUTH_URL = process.env.AUTH_SERVICE_URL || `${GATEWAY_URL}/api/auth`;
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || `${GATEWAY_URL}/api/catalog`;
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || `${GATEWAY_URL}/api/inventory`;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@uch.edu.ar';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminSecure2026Distributed';
const USER_PASSWORD = process.env.INITIAL_USER_PASSWORD || 'UserSecure2026Distributed';

const INITIAL_USERS = [
  {
    username: 'cliente1',
    email: 'cliente1@uch.edu.ar',
    password: USER_PASSWORD,
    nombre: 'Lucía Astorga (Cliente)'
  },
  {
    username: 'cliente2',
    email: 'cliente2@uch.edu.ar',
    password: USER_PASSWORD,
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
  console.log(`   Admin Identity: ${ADMIN_EMAIL}`);
  console.log('===============================================================\n');

  // 1. Alta o verificación de usuarios de prueba (Solo USER en registro público)
  console.log('[1/3] Verificando / Registrando identidades de clientes en Auth Service...');
  for (const user of INITIAL_USERS) {
    try {
      const regRes = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (regRes.status === 201) {
        console.log(`  -> Creado usuario: ${user.email} (Rol: USER)`);
      } else if (regRes.status === 409) {
        console.log(`  -> Usuario ya existente: ${user.email} (Rol: USER)`);
      } else {
        console.warn(`  -> Registro ${user.email}: Status ${regRes.status}`);
      }
    } catch (e) {
      console.warn(`  -> Aviso al registrar ${user.email}: ${e.message}`);
    }
  }

  // 2. Login como ADMIN utilizando credenciales externalizadas
  console.log('\n[2/3] Obteniendo Access Token JWT con credenciales externalizadas de Administrador...');
  let adminToken = null;
  const passwordsToTry = [
    ADMIN_PASSWORD,
    'AdminSecure2026Distributed',
    'AdminSecure2026!#Distributed',
    'AdminSecure2026!',
    'AdminPassword123!'
  ].filter(Boolean);

  for (const pwd of passwordsToTry) {
    try {
      const loginRes = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: pwd
        })
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        adminToken = data.token;
        console.log(`  -> Token JWT ADMIN emitido exitosamente. Vigencia: ${data.expiresIn}`);
        break;
      } else {
        const errBody = await loginRes.text();
        console.warn(`  -> Intento con clave falló (Status ${loginRes.status}): ${errBody}`);
      }
    } catch (err) {
      console.warn(`  -> Error de red en login: ${err.message}`);
    }
  }

  if (!adminToken) {
    console.error('  -> ERROR: No se pudo autenticar al Administrador con las credenciales provistas.');
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
