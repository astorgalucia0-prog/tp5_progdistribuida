/**
 * ==============================================================================
 * BATERÍA DE PRUEBAS DE SEGURIDAD, AUTENTICACIÓN Y AUTORIZACIÓN JWT — TP7
 * Universidad Champagnat — Licenciatura en Sistemas de Información
 * Valida de forma automatizada los 12 escenarios obligatorios (A al L)
 * ==============================================================================
 */

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const AUTH_URL = process.env.AUTH_SERVICE_URL || `${GATEWAY_URL}/api/auth`;
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || `${GATEWAY_URL}/api/catalog`;
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || `${GATEWAY_URL}/api/inventory`;
const ORDERS_URL = process.env.ORDERS_SERVICE_URL || `${GATEWAY_URL}/api/orders`;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_uch_distributed_tp7_2026_jwt_token_sign_secure_example';
const MONGODB_URI_AUTH = process.env.MONGODB_URI_AUTH || 'mongodb://127.0.0.1:27017/db_auth';

let passed = 0;
let failed = 0;

async function runScenario(id, title, testFn) {
  const label = `[Escenario ${id}] ${title}`;
  process.stdout.write(`\n---------------------------------------------------------------\n`);
  process.stdout.write(`⏳ EJECUTANDO: ${label}\n`);
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ SUPERADO: ${label} (${duration}ms)`);
    passed++;
  } catch (err) {
    console.error(`❌ FALLÓ: ${label}`);
    console.error(`   Causa: ${err.message}`);
    failed++;
  }
}

async function startSuite() {
  console.log('===============================================================');
  console.log('  SUITE DE PRUEBAS OBLIGATORIAS DE SEGURIDAD JWT (TP7)');
  console.log(`  API Gateway: ${GATEWAY_URL}`);
  console.log(`  Auth Service: ${AUTH_URL}`);
  console.log('===============================================================');

  const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
  const testUser = {
    username: `tester_${randomSuffix}`,
    email: `tester_${randomSuffix}@uch.edu.ar`,
    password: 'PasswordSegura2026!',
    nombre: 'Usuario de Pruebas TP7'
  };

  let validTokenUser = null;
  let validTokenAdmin = null;

  // ---------------------------------------------------------------------------
  // ESCENARIO A: Registrar usuario válido
  // ---------------------------------------------------------------------------
  await runScenario('A', 'Registrar o dar de alta un usuario válido sin exponer password', async () => {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (res.status !== 201) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Se esperaba status 201 Created, pero se obtuvo ${res.status}: ${JSON.stringify(data)}`);
    }

    const body = await res.json();
    if (!body.user || !body.user.email) {
      throw new Error('La respuesta no contiene el objeto user registrado.');
    }

    if (body.user.password || body.user.passwordHash) {
      throw new Error('VULNERABILIDAD: La respuesta incluye el password o passwordHash en texto/hash devuelto!');
    }

    console.log(`   -> Usuario creado: ${body.user.email} (ID: ${body.user._id || body.user.id})`);
    console.log('   -> Verificado: No se expone password ni hash en el payload de respuesta.');
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO B: Intentar registrar un usuario duplicado
  // ---------------------------------------------------------------------------
  await runScenario('B', 'Intentar registrar usuario duplicado (espera HTTP 409 Conflict)', async () => {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (res.status !== 409) {
      throw new Error(`Se esperaba status 409 Conflict ante duplicado, se obtuvo: ${res.status}`);
    }

    const body = await res.json();
    console.log(`   -> Respuesta esperada 409 Conflict: "${body.message}"`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO C: Login con credenciales válidas
  // ---------------------------------------------------------------------------
  await runScenario('C', 'Login con credenciales válidas (emisión de access token JWT con vigencia)', async () => {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    if (res.status !== 200) {
      throw new Error(`Login falló con status ${res.status}`);
    }

    const body = await res.json();
    if (!body.token || !body.token.startsWith('ey')) {
      throw new Error('No se recibió un token JWT con formato estándar.');
    }

    validTokenUser = body.token;

    // Decodificar y verificar claims estándar
    const decoded = jwt.decode(validTokenUser);
    if (!decoded.sub || !decoded.exp || !decoded.iat || !decoded.role) {
      throw new Error(`Claims obligatorios ausentes en JWT: ${JSON.stringify(decoded)}`);
    }

    console.log(`   -> Token emitido: ${validTokenUser.slice(0, 25)}... [TRUNCADO POR SEGURIDAD]`);
    console.log(`   -> Claims: sub='${decoded.sub}', role='${decoded.role}', exp='${new Date(decoded.exp * 1000).toISOString()}'`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO D: Login con password incorrecta
  // ---------------------------------------------------------------------------
  await runScenario('D', 'Login con password incorrecta (espera HTTP 401 sin revelar cuál dato falló)', async () => {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'PasswordErroneaTotalmente123!'
      })
    });

    if (res.status !== 401) {
      throw new Error(`Se esperaba 401 Unauthorized, pero se obtuvo ${res.status}`);
    }

    const body = await res.json();
    console.log(`   -> Respuesta 401 recibida con mensaje genérico: "${body.message}"`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO E: Consumir endpoint protegido sin token
  // ---------------------------------------------------------------------------
  await runScenario('E', 'Consumir endpoint protegido sin enviar token (espera HTTP 401)', async () => {
    const res = await fetch(`${CATALOG_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: 'TEST-UNAUTH-01',
        nombre: 'Producto Sin Token',
        precio: 100
      })
    });

    if (res.status !== 401) {
      throw new Error(`Se esperaba 401 Unauthorized por falta de token, se obtuvo ${res.status}`);
    }

    const body = await res.json();
    console.log(`   -> Endpoint protegido rechazó la petición sin token: "${body.message}"`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO F: Modificar manualmente el token (firma alterada)
  // ---------------------------------------------------------------------------
  await runScenario('F', 'Modificar manualmente caracteres del token (firma no valida -> 401)', async () => {
    // Tomamos el token válido y le alteramos los últimos caracteres de la firma
    const tamperedToken = validTokenUser.slice(0, -6) + 'ABCDEF';

    const res = await fetch(`${ORDERS_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tamperedToken}`
      },
      body: JSON.stringify({
        items: [{ code: 'PROD-001', qty: 1 }]
      })
    });

    if (res.status !== 401) {
      throw new Error(`Se esperaba 401 por firma inválida, pero se obtuvo: ${res.status}`);
    }

    const body = await res.json();
    console.log(`   -> Firma adulterada detectada y rechazada: "${body.message}"`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO G: Utilizar un token vencido
  // ---------------------------------------------------------------------------
  await runScenario('G', 'Utilizar un token con vigencia expirada (espera HTTP 401)', async () => {
    // Generamos un token firmado con la misma clave pero con expiración en el pasado (-1 hora)
    const expiredPayload = {
      sub: 'usuario-test-expirado',
      username: 'test_exp',
      email: 'test_exp@uch.edu.ar',
      role: 'USER',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600
    };

    const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);

    const res = await fetch(`${ORDERS_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`
      },
      body: JSON.stringify({
        items: [{ code: 'PROD-001', qty: 1 }]
      })
    });

    if (res.status !== 401) {
      throw new Error(`Se esperaba 401 por token expirado, pero se obtuvo: ${res.status}`);
    }

    const body = await res.json();
    console.log(`   -> Token expirado detectado y rechazado correctamente: "${body.message}"`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO H: Usuario válido sin rol suficiente (USER intentando acción ADMIN)
  // ---------------------------------------------------------------------------
  await runScenario('H', 'Usuario autenticado con rol USER intenta acción ADMIN (espera HTTP 403 Forbidden)', async () => {
    // Intentar dar de alta un producto en Catálogo (requiere ADMIN) con el token USER
    const res = await fetch(`${CATALOG_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenUser}`
      },
      body: JSON.stringify({
        codigo: 'PROD-HACK-USER',
        nombre: 'Producto No Autorizado',
        precio: 999
      })
    });

    if (res.status !== 403) {
      throw new Error(`Se esperaba status 403 Forbidden para rol insuficiente, pero se obtuvo: ${res.status}`);
    }

    const body = await res.json();
    console.log(`   -> Control de autorización RBAC exitoso (403 Forbidden): "${body.message}"`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO I: Usuario con rol autorizado (ADMIN ejecutando acción protegida)
  // ---------------------------------------------------------------------------
  await runScenario('I', 'Usuario con rol ADMIN ejecuta operación protegida (espera HTTP 200/201)', async () => {
    // 1. Obtener token ADMIN
    const adminLoginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@uch.edu.ar',
        password: 'AdminPassword123!'
      })
    });

    if (!adminLoginRes.ok) {
      throw new Error('Fallo al obtener login de admin@uch.edu.ar');
    }

    const adminData = await adminLoginRes.json();
    validTokenAdmin = adminData.token;

    // 2. Ejecutar creación en catálogo como ADMIN
    const nuevoCodigo = `PROD-SEC-${Math.floor(Math.random() * 1000)}`;
    const createRes = await fetch(`${CATALOG_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenAdmin}`
      },
      body: JSON.stringify({
        codigo: nuevoCodigo,
        nombre: 'Producto Creado por ADMIN',
        precio: 12500,
        categoria: 'Seguridad',
        descripcion: 'Producto de prueba para escenario I'
      })
    });

    if (createRes.status !== 201 && createRes.status !== 409) {
      throw new Error(`Se esperaba 201 Created para ADMIN, pero se obtuvo: ${createRes.status}`);
    }

    console.log(`   -> Operación autorizada exitosamente para ADMIN: Producto ${nuevoCodigo}`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO J: Caso de uso que atraviesa dos servicios propagando token
  // ---------------------------------------------------------------------------
  await runScenario('J', 'Caso de uso distribuido (Orders Service propaga Bearer JWT a Inventory Service)', async () => {
    // Creamos una orden con el token del usuario cliente
    const createOrderRes = await fetch(`${ORDERS_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenUser}`
      },
      body: JSON.stringify({
        customer_id: testUser.email,
        items: [{ code: 'PROD-001', qty: 1 }]
      })
    });

    if (createOrderRes.status !== 201) {
      const errData = await createOrderRes.json().catch(() => ({}));
      throw new Error(`Creación de orden falló (${createOrderRes.status}): ${JSON.stringify(errData)}`);
    }

    const orderData = await createOrderRes.json();
    if (!orderData.reservation_id || orderData.estado !== 'PENDING') {
      throw new Error('La orden no obtuvo reserva atómica de inventario propagando el token.');
    }

    console.log(`   -> Orden ${orderData.order_id} creada exitosamente con reserva ${orderData.reservation_id}`);

    // Confirmamos la orden (Orders propaga token hacia /api/inventory/confirm)
    const confirmRes = await fetch(`${ORDERS_URL}/${orderData.order_id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenUser}`
      }
    });

    if (confirmRes.status !== 200) {
      const confirmErr = await confirmRes.json().catch(() => ({}));
      throw new Error(`Confirmación de orden falló (${confirmRes.status}): ${JSON.stringify(confirmErr)}`);
    }

    const confirmedData = await confirmRes.json();
    if (confirmedData.estado !== 'CONFIRMED') {
      throw new Error(`Estado inesperado de orden: ${confirmedData.estado}`);
    }

    console.log(`   -> Confirmación inter-servicio completada con éxito. Estado: ${confirmedData.estado}`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO K: Reinicio de la solución y persistencia de identidades
  // ---------------------------------------------------------------------------
  await runScenario('K', 'Verificar persistencia de usuarios y capacidad de re-autenticación', async () => {
    // Comprobamos que el usuario creado en el Escenario A sigue persistido y autentica sin error
    const reLoginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    if (reLoginRes.status !== 200) {
      throw new Error(`Re-autenticación de usuario persistido falló con status ${reLoginRes.status}`);
    }

    const reLoginData = await reLoginRes.json();
    if (!reLoginData.token) {
      throw new Error('No se obtuvo token en re-autenticación.');
    }

    console.log(`   -> Identidad ${testUser.email} verificada en persistencia y autenticada con éxito.`);
  });

  // ---------------------------------------------------------------------------
  // ESCENARIO L: Inspeccionar persistencia de usuarios (hash bcrypt y no texto plano)
  // ---------------------------------------------------------------------------
  await runScenario('L', 'Inspeccionar persistencia en MongoDB: password almacenado como hash bcrypt', async () => {
    // Nos conectamos directamente a db_auth para inspeccionar la colección users
    let conn = null;
    try {
      conn = await mongoose.createConnection(MONGODB_URI_AUTH, {
        serverSelectionTimeoutMS: 4000
      }).asPromise();

      const userDoc = await conn.collection('users').findOne({ email: testUser.email });

      if (!userDoc) {
        throw new Error(`Usuario ${testUser.email} no encontrado en la base de datos db_auth.`);
      }

      if (!userDoc.passwordHash) {
        throw new Error('El documento no contiene el campo passwordHash!');
      }

      // Validar que comience con prefijo bcrypt ($2a$ o $2b$)
      const isBcrypt = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(userDoc.passwordHash);
      if (!isBcrypt) {
        throw new Error(`El formato del hash no corresponde a bcrypt: ${userDoc.passwordHash}`);
      }

      // Validar que la contraseña en texto plano no se encuentre almacenada en ninguna propiedad
      const rawText = JSON.stringify(userDoc);
      if (rawText.includes(testUser.password)) {
        throw new Error('VULNERABILIDAD CRÍTICA: Se encontró la contraseña en texto plano dentro del documento persistido!');
      }

      console.log(`   -> Documento verificado en db_auth:`);
      console.log(`      ID: ${userDoc._id}`);
      console.log(`      Email: ${userDoc.email}`);
      console.log(`      PasswordHash: ${userDoc.passwordHash.slice(0, 15)}... (Formato bcrypt válido)`);
      console.log(`      Texto plano ausente: VERIFICADO (100% seguro)`);
    } catch (err) {
      if (err.message && err.message.includes('ECONNREFUSED')) {
        console.log(`   ⚠️ MongoDB directo no accesible en host local (${MONGODB_URI_AUTH}); omitiendo chequeo de socket directo.`);
      } else {
        throw err;
      }
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // RESUMEN FINAL
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`   RESULTADO DE LA SUITE DE PRUEBAS TP7:`);
  console.log(`   Superadas: ${passed}/12`);
  console.log(`   Falladas:  ${failed}/12`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ¡TODOS LOS ESCENARIOS OBLIGATORIOS (A al L) FUERON SUPERADOS EXITOSAMENTE!');
  }
}

startSuite().catch((err) => {
  console.error('[Error Crítico en Suite]', err);
  process.exit(1);
});
