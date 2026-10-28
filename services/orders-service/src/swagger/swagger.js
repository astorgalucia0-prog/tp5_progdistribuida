import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Orders Service API',
    version: '1.0.0',
    description: 'Documentación OpenAPI del microservicio de Órdenes y Checkout con Seguridad RBAC y Control de Propiedad (TP7)'
  },
  servers: [
    {
      url: '/api/orders',
      description: 'Prefijo API Orders'
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
        summary: 'Verifica la salud del microservicio y sus dependencias (Público)',
        responses: {
          '200': { description: 'Servicio en estado saludable' },
          '503': { description: 'Servicio degradado' }
        }
      }
    },
    '/': {
      post: {
        summary: 'Crea una nueva orden de compra (Autenticado: USER o ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  customer_id: { type: 'string', example: 'cliente1@uch.edu.ar', description: 'Opcional si es USER (se infiere de su JWT)' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['code', 'qty'],
                      properties: {
                        code: { type: 'string', example: 'PROD-001' },
                        qty: { type: 'integer', example: 2 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Orden creada en estado PENDING con reserva activa' },
          '400': { description: 'Parámetros inválidos' },
          '401': { description: 'Token ausente, inválido o expirado (HTTP 401 Unauthorized)' },
          '404': { description: 'Producto no encontrado en catálogo o inventario' },
          '409': { description: 'Stock insuficiente' },
          '503': { description: 'Dependencia remota (Catalog o Inventory) no disponible' }
        }
      }
    },
    '/{order_id}': {
      get: {
        summary: 'Obtiene el detalle y estado de una orden por ID (Autenticado - Regla de Propiedad: Solo Dueño o ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'order_id', in: 'path', required: true, schema: { type: 'string' }, example: 'ORD-12345678' }
        ],
        responses: {
          '200': { description: 'Detalle de la orden' },
          '401': { description: 'Token ausente o inválido (HTTP 401 Unauthorized)' },
          '403': { description: 'Acceso denegado: No es dueño de esta orden ni ADMIN (HTTP 403 Forbidden)' },
          '404': { description: 'Orden no encontrada' }
        }
      }
    },
    '/customer/{customer_id}': {
      get: {
        summary: 'Obtiene todas las órdenes de un cliente (Autenticado - Regla de Propiedad: Solo Dueño o ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'customer_id', in: 'path', required: true, schema: { type: 'string' }, example: 'cliente1@uch.edu.ar' }
        ],
        responses: {
          '200': { description: 'Lista de órdenes del cliente' },
          '401': { description: 'Token ausente o inválido (HTTP 401 Unauthorized)' },
          '403': { description: 'Acceso denegado: No posee autorización para ver compras de otro cliente (HTTP 403 Forbidden)' }
        }
      }
    },
    '/{order_id}/confirm': {
      post: {
        summary: 'Confirma una orden pendiente y deduce definitivamente el stock reservado (Dueño o ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'order_id', in: 'path', required: true, schema: { type: 'string' }, example: 'ORD-12345678' }
        ],
        responses: {
          '200': { description: 'Orden confirmada' },
          '400': { description: 'Estado no permite confirmación' },
          '401': { description: 'Token ausente o inválido (HTTP 401 Unauthorized)' },
          '403': { description: 'Acceso denegado: No es dueño de esta orden ni ADMIN (HTTP 403 Forbidden)' },
          '404': { description: 'Orden no encontrada' },
          '503': { description: 'Inventory Service no disponible para confirmar' }
        }
      }
    },
    '/{order_id}/cancel': {
      post: {
        summary: 'Cancela una orden pendiente y libera el stock reservado (Dueño o ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'order_id', in: 'path', required: true, schema: { type: 'string' }, example: 'ORD-12345678' }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'USER_CANCELLED' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Orden cancelada y reserva liberada' },
          '400': { description: 'Estado no permite cancelación' },
          '401': { description: 'Token ausente o inválido (HTTP 401 Unauthorized)' },
          '403': { description: 'Acceso denegado: No es dueño de esta orden ni ADMIN (HTTP 403 Forbidden)' },
          '404': { description: 'Orden no encontrada' },
          '503': { description: 'Inventory Service no disponible para liberar' }
        }
      }
    }
  }
};

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api/orders/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
}
