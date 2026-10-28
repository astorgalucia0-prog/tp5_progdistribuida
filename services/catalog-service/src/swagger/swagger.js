import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Catalog Service API',
    version: '1.0.0',
    description: 'Documentación OpenAPI del microservicio de Catálogo Comercial con Seguridad RBAC (TP7)'
  },
  servers: [
    {
      url: '/api/catalog',
      description: 'Prefijo API Catalog'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el Access Token JWT obtenido en /api/auth/login. Formato: Bearer <token>'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Verifica la salud del servicio y su conexión con MongoDB',
        responses: {
          '200': { description: 'Servicio en estado saludable' },
          '503': { description: 'Servicio degradado por falla de base de datos' }
        }
      }
    },
    '/products': {
      get: {
        summary: 'Listado de productos comerciales (Público)',
        parameters: [
          { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por categoría' },
          { name: 'todos', in: 'query', schema: { type: 'boolean' }, description: 'Incluir productos inactivos' }
        ],
        responses: {
          '200': { description: 'Lista de productos activos' }
        }
      },
      post: {
        summary: 'Alta de un nuevo producto comercial (Restringido: Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'nombre', 'precio'],
                properties: {
                  codigo: { type: 'string', example: 'PROD-004' },
                  nombre: { type: 'string', example: 'Auriculares Inalámbricos' },
                  precio: { type: 'number', example: 35000 },
                  categoria: { type: 'string', example: 'Audio' },
                  descripcion: { type: 'string', example: 'Auriculares Bluetooth con cancelación activa' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Producto creado' },
          '400': { description: 'Datos inválidos' },
          '401': { description: 'Token ausente, inválido o expirado (HTTP 401 Unauthorized)' },
          '403': { description: 'Permisos insuficientes: Requiere rol ADMIN (HTTP 403 Forbidden)' },
          '409': { description: 'Código de producto ya existente' }
        }
      }
    },
    '/products/{code}': {
      get: {
        summary: 'Obtiene la ficha de un producto por código (Público)',
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'PROD-001' }
        ],
        responses: {
          '200': { description: 'Ficha del producto' },
          '400': { description: 'Código mal formado' },
          '404': { description: 'Producto no encontrado' }
        }
      },
      put: {
        summary: 'Actualiza los datos comerciales de un producto (Restringido: Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'PROD-001' }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  precio: { type: 'number' },
                  categoria: { type: 'string' },
                  descripcion: { type: 'string' },
                  activo: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Producto actualizado' },
          '401': { description: 'Token ausente, inválido o expirado' },
          '403': { description: 'Permisos insuficientes: Requiere rol ADMIN' },
          '404': { description: 'Producto no encontrado' }
        }
      },
      delete: {
        summary: 'Baja lógica de producto (Restringido: Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'PROD-001' }
        ],
        responses: {
          '200': { description: 'Producto dado de baja lógicamente' },
          '401': { description: 'Token ausente, inválido o expirado' },
          '403': { description: 'Permisos insuficientes: Requiere rol ADMIN' },
          '404': { description: 'Producto no encontrado' }
        }
      }
    },
    '/categories': {
      get: {
        summary: 'Listado de categorías activas (Público)',
        responses: {
          '200': { description: 'Array con nombres de categorías' }
        }
      }
    }
  }
};

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api/catalog/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
}
