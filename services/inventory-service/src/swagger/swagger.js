import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Inventory Service API',
    version: '1.0.0',
    description: 'Documentación OpenAPI del microservicio de Inventario y Control de Existencias con Seguridad RBAC (TP7)'
  },
  servers: [
    {
      url: '/api/inventory',
      description: 'Prefijo API Inventory'
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
        summary: 'Verifica la salud del servicio, MongoDB y Redis',
        responses: {
          '200': { description: 'Servicio en estado saludable o funcional' },
          '503': { description: 'Servicio no disponible' }
        }
      }
    },
    '/{code}': {
      get: {
        summary: 'Consulta disponibilidad y existencias físicas de un producto (Público)',
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'PROD-001' }
        ],
        responses: {
          '200': { description: 'Detalle de existencias y disponibilidad' },
          '404': { description: 'Producto no encontrado' }
        }
      }
    },
    '/reserve': {
      post: {
        summary: 'Reserva temporal atómica de existencias (Autenticado: USER o ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['order_id', 'items'],
                properties: {
                  order_id: { type: 'string', example: 'ORD-1001' },
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
          '200': { description: 'Reserva confirmada temporalmente' },
          '400': { description: 'Parámetros inválidos' },
          '401': { description: 'Token ausente, inválido o expirado (HTTP 401 Unauthorized)' },
          '409': { description: 'Stock insuficiente para satisfacer la reserva' },
          '423': { description: 'Recurso bloqueado concurrentemente' }
        }
      }
    },
    '/confirm': {
      post: {
        summary: 'Deducción definitiva de stock tras confirmación de compra (Autenticado: USER o ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reservation_id'],
                properties: {
                  reservation_id: { type: 'string', example: 'RES-501' },
                  order_id: { type: 'string', example: 'ORD-1001' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Stock deducido con éxito' },
          '401': { description: 'Token ausente, inválido o expirado' },
          '404': { description: 'Reserva no encontrada' }
        }
      }
    },
    '/release': {
      post: {
        summary: 'Liberación de reserva por cancelación o expiración (Autenticado: USER o ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reservation_id'],
                properties: {
                  reservation_id: { type: 'string', example: 'RES-501' },
                  reason: { type: 'string', example: 'PAYMENT_FAILED' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Reserva liberada' },
          '401': { description: 'Token ausente, inválido o expirado' },
          '404': { description: 'Reserva no encontrada' }
        }
      }
    },
    '/{code}/stock': {
      post: {
        summary: 'Ajuste manual o reposición de existencias en almacén (Restringido: Solo ADMIN)',
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
                  stock_total: { type: 'integer', example: 50 },
                  delta: { type: 'integer', example: 10 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Stock actualizado con éxito' },
          '400': { description: 'Ajuste no permitido o valores negativos' },
          '401': { description: 'Token ausente, inválido o expirado (HTTP 401 Unauthorized)' },
          '403': { description: 'Permisos insuficientes: Requiere rol ADMIN (HTTP 403 Forbidden)' }
        }
      }
    }
  }
};

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api/inventory/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
}
