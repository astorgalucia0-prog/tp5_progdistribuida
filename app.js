// ==============================================================================
// UNIVERSIDAD CHAMPAGNAT - Licenciatura en Sistemas de Información
// Programación Distribuida - Trabajo Práctico N° 1
// API REST con Node.js y Express (Recurso: Accesorios)
// ==============================================================================

const express = require('express');
const app = express();
const PORT = 3000;

// 1. HERRAMIENTAS Y MIDDLEWARES
// Configuración para recibir y procesar datos en formato JSON (req.body)
app.use(express.json());

// Servir la interfaz gráfica estática del panel de administración
app.use(express.static('public'));

// 2. DATOS MOCKEADOS EN MEMORIA
// Arreglo en memoria para almacenar la entidad 'Accesorios' durante la ejecución
let accesorios = [
  { id: 1, nombre: 'Funda de Silicona', precio: 15000.00, stock: 50, categoria: 'Cases', descripcion: 'Funda protectora de silicona suave con textura antideslizante y protección contra caídas.' },
  { id: 2, nombre: 'Cargador Rápido 20W', precio: 25000.00, stock: 30, categoria: 'Cargadores', descripcion: 'Cargador de pared de carga ultrarrápida de 20W con conector USB-C inteligente.' },
  { id: 3, nombre: 'Auriculares Bluetooth', precio: 30000.00, stock: 15, categoria: 'Audio', descripcion: 'Auriculares inalámbricos TWS con reducción de ruido ambiental y batería de larga duración.' }
];

// MIDDLEWARE DE AUTENTICACIÓN (Código 401 - Unauthorized)
// Valida la cabecera 'auth-tienda' exigiendo 'admin123' para operaciones de escritura
const verificarAuth = (req, res, next) => {
  const token = req.headers['auth-tienda'];
  
  if (token !== 'admin123') {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      mensaje: 'Acceso no autorizado. Debe incluir el encabezado "auth-tienda" con valor "admin123".'
    });
  }
  next();
};

// ==============================================================================
// 3. ENDPOINTS Y OPERACIONES CRUD
// ==============================================================================

// ------------------------------------------------------------------------------
// GET /api/accesorios - Listar todos los registros
// Códigos HTTP: 200 OK / 500 Internal Server Error
// ------------------------------------------------------------------------------
app.get('/api/accesorios', (req, res) => {
  try {
    res.status(200).json({
      status: 200,
      total: accesorios.length,
      data: accesorios
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      mensaje: 'Error no previsto en el servidor al consultar los registros.',
      detalle: error.message
    });
  }
});

// ------------------------------------------------------------------------------
// GET /api/error-simulado - Endpoint de prueba para simular 500 Internal Server Error
// Códigos HTTP: 500 Internal Server Error
// ------------------------------------------------------------------------------
app.get('/api/error-simulado', (req, res) => {
  try {
    throw new Error('Simulación de fallo interno en el servidor.');
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      mensaje: 'Error no previsto en el servidor al procesar la solicitud.',
      detalle: error.message
    });
  }
});

// ------------------------------------------------------------------------------
// GET /api/accesorios/:id - Endpoint Adicional Recomendado: Consultar registro por ID
// Códigos HTTP: 200 OK / 400 Bad Request / 404 Not Found / 500 Internal Server Error
// ------------------------------------------------------------------------------
app.get('/api/accesorios/:id', (req, res) => {
  try {
    const idParam = parseInt(req.params.id, 10);

    // Validación 400 Bad Request: ID no numérico o inválido
    if (isNaN(idParam) || idParam <= 0) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        mensaje: 'El parámetro ID debe ser un número entero positivo válido.'
      });
    }

    const accesorio = accesorios.find(a => a.id === idParam);

    // Validación 404 Not Found: Recurso no encontrado
    if (!accesorio) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        mensaje: `No se encontró ningún accesorio con el ID: ${idParam}`
      });
    }

    res.status(200).json({
      status: 200,
      data: accesorio
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      mensaje: 'Error interno del servidor al consultar el accesorio.'
    });
  }
});

// ------------------------------------------------------------------------------
// POST /api/accesorios - Crear un nuevo registro a partir del body JSON
// Códigos HTTP: 201 Created / 400 Bad Request / 401 Unauthorized / 500 Internal Server Error
// ------------------------------------------------------------------------------
app.post('/api/accesorios', verificarAuth, (req, res) => {
  try {
    const { nombre, precio, stock, categoria, descripcion } = req.body;

    // Validación 400 Bad Request: Datos incompletos o tipos inválidos
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '' ||
        precio === undefined || isNaN(precio) || Number(precio) < 0 ||
        stock === undefined || isNaN(stock) || Number(stock) < 1 || Number(stock) > 50000) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        mensaje: 'Datos de entrada inválidos. El campo "stock" debe ser un número entero entre 1 y 50.000.'
      });
    }

    if (descripcion && typeof descripcion === 'string') {
      const cantPalabras = descripcion.trim().split(/\s+/).filter(Boolean).length;
      if (cantPalabras > 200) {
        return res.status(400).json({
          status: 400,
          error: 'Bad Request',
          mensaje: 'La descripción no puede superar las 200 palabras.'
        });
      }
    }

    // Autoincrementar el ID de forma dinámica
    const nuevoId = accesorios.length > 0 ? Math.max(...accesorios.map(a => a.id)) + 1 : 1;

    const nuevoAccesorio = {
      id: nuevoId,
      nombre: nombre.trim(),
      precio: Number(precio),
      stock: Number(stock),
      categoria: (typeof categoria === 'string' && categoria.trim() !== '') ? categoria.trim() : 'Otros',
      descripcion: (typeof descripcion === 'string') ? descripcion.trim() : ''
    };

    // Modificación real del arreglo en memoria
    accesorios.push(nuevoAccesorio);

    res.status(201).json({
      status: 201,
      mensaje: 'Accesorio creado exitosamente.',
      data: nuevoAccesorio
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      mensaje: 'Error interno del servidor al crear el recurso.'
    });
  }
});

// ------------------------------------------------------------------------------
// PUT /api/accesorios/:id - Modificar un registro existente identificado por id
// Códigos HTTP: 200 OK / 400 Bad Request / 404 Not Found / 401 Unauthorized / 500 Internal Server Error
// ------------------------------------------------------------------------------
app.put('/api/accesorios/:id', verificarAuth, (req, res) => {
  try {
    const idParam = parseInt(req.params.id, 10);

    // Validación 400 Bad Request: ID inválido
    if (isNaN(idParam) || idParam <= 0) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        mensaje: 'El parámetro ID debe ser un número entero positivo válido.'
      });
    }

    const index = accesorios.findIndex(a => a.id === idParam);

    // Validación 404 Not Found: Registro no existente
    if (index === -1) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        mensaje: `No se encontró ningún accesorio con el ID: ${idParam}`
      });
    }

    const { nombre, precio, stock, categoria, descripcion } = req.body;

    // Validación 400 Bad Request para datos actualizados inválidos
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
      return res.status(400).json({ status: 400, error: 'Bad Request', mensaje: 'El campo "nombre" no puede estar vacío.' });
    }
    if (precio !== undefined && (isNaN(precio) || Number(precio) < 0)) {
      return res.status(400).json({ status: 400, error: 'Bad Request', mensaje: 'El campo "precio" debe ser un número mayor o igual a 0.' });
    }
    if (stock !== undefined && (isNaN(stock) || Number(stock) < 1 || Number(stock) > 50000)) {
      return res.status(400).json({ status: 400, error: 'Bad Request', mensaje: 'El campo "stock" debe ser un número entre 1 y 50.000.' });
    }
    if (descripcion !== undefined && typeof descripcion === 'string') {
      const cantPalabras = descripcion.trim().split(/\s+/).filter(Boolean).length;
      if (cantPalabras > 200) {
        return res.status(400).json({ status: 400, error: 'Bad Request', mensaje: 'La descripción no puede superar las 200 palabras.' });
      }
    }

    // Modificación real del registro en el arreglo
    if (nombre !== undefined) accesorios[index].nombre = nombre.trim();
    if (precio !== undefined) accesorios[index].precio = Number(precio);
    if (stock !== undefined) accesorios[index].stock = Number(stock);
    if (categoria !== undefined && typeof categoria === 'string') accesorios[index].categoria = categoria.trim();
    if (descripcion !== undefined && typeof descripcion === 'string') accesorios[index].descripcion = descripcion.trim();

    res.status(200).json({
      status: 200,
      mensaje: 'Accesorio actualizado exitosamente.',
      data: accesorios[index]
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      mensaje: 'Error interno del servidor al modificar el registro.'
    });
  }
});

// ------------------------------------------------------------------------------
// DELETE /api/accesorios/:id - Eliminar un registro existente identificado por id
// Códigos HTTP: 200 OK / 400 Bad Request / 404 Not Found / 401 Unauthorized / 500 Internal Server Error
// ------------------------------------------------------------------------------
app.delete('/api/accesorios/:id', verificarAuth, (req, res) => {
  try {
    const idParam = parseInt(req.params.id, 10);

    if (isNaN(idParam) || idParam <= 0) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        mensaje: 'El parámetro ID debe ser un número entero positivo válido.'
      });
    }

    const index = accesorios.findIndex(a => a.id === idParam);

    if (index === -1) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        mensaje: `No se encontró ningún accesorio con el ID: ${idParam}`
      });
    }

    // Modificación real: eliminar el registro del arreglo
    const [accesorioEliminado] = accesorios.splice(index, 1);

    res.status(200).json({
      status: 200,
      mensaje: 'Accesorio eliminado exitosamente.',
      data: accesorioEliminado
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      mensaje: 'Error interno del servidor al eliminar el registro.'
    });
  }
});

// ------------------------------------------------------------------------------
// MANEJADOR 404 NOT FOUND (Rutas no encontradas)
// ------------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    mensaje: `La ruta solicitada '${req.originalUrl}' no existe en este servidor.`
  });
});

// ------------------------------------------------------------------------------
// INICIO DEL SERVIDOR
// ------------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en http://localhost:${PORT}`);
});
