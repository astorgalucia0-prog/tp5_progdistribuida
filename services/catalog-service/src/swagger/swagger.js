import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Catalog Service API',
    version: '1.0.0',
    description: 'Documentación OpenAPI del microservicio de Catálogo Comercial'
  },
  servers: [
    {
      url: '/api/catalog',
      description: 'Prefijo API Catalog'
    }
  ],
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
        summary: 'Listado de productos comerciales',
        parameters: [
          { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por categoría' },
          { name: 'todos', in: 'query', schema: { type: 'boolean' }, description: 'Incluir productos inactivos' }
        ],
        responses: {
          '200': { description: 'Lista de productos activos' }
        }
      },
      post: {
        summary: 'Alta de un nuevo producto comercial',
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
          '409': { description: 'Código de producto ya existente' }
        }
      }
    },
    '/products/{code}': {
      get: {
        summary: 'Obtiene la ficha de un producto por código',
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
        summary: 'Actualiza los datos comerciales de un producto',
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
          '404': { description: 'Producto no encontrado' }
        }
      },
      delete: {
        summary: 'Baja lógica de producto (activo: false)',
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'PROD-001' }
        ],
        responses: {
          '200': { description: 'Producto dado de baja lógicamente' },
          '404': { description: 'Producto no encontrado' }
        }
      }
    },
    '/categories': {
      get: {
        summary: 'Listado de categorías activas',
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
}
