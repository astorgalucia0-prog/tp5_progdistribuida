import swaggerUi from 'swagger-ui-express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API REST de Productos - TP3 Programación Distribuida',
    version: '1.0.0',
    description:
      'API REST con persistencia en MongoDB (Mongoose), logging centralizado con rotación (Winston), exclusión mutua con Redis/Memurai y documentación Swagger/OpenAPI.',
    contact: {
      name: 'Cátedra Programación Distribuida',
      url: 'https://www.uch.edu.ar'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor HTTP Local (Desarrollo)'
    },
    {
      url: 'https://localhost:3443',
      description: 'Servidor HTTPS Local (Desarrollo)'
    }
  ],
  paths: {
    '/api': {
      get: {
        summary: 'Estado de la API y servicios',
        tags: ['Diagnóstico'],
        responses: {
          '200': {
            description: 'Servidor y dependencias activas',
            content: {
              'application/json': {
                example: {
                  estado: 'API en línea (TP3)',
                  mongoConectado: true,
                  redisConectado: true,
                  timestamp: '2026-09-02T12:00:00.000Z'
                }
              }
            }
          }
        }
      }
    },
    '/api/productos': {
      get: {
        summary: 'Listar todos los productos',
        tags: ['Productos'],
        responses: {
          '200': {
            description: 'Lista de productos registrados en MongoDB',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Producto' }
                }
              }
            }
          },
          '500': { $ref: '#/components/responses/ServerError' }
        }
      },
      post: {
        summary: 'Crear un nuevo producto',
        tags: ['Productos'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductoInput' },
              example: {
                codigo: 'PROD-100',
                nombre: 'Auriculares Inalámbricos',
                precio: 75000,
                stock: 10,
                categoria: 'Audio',
                descripcion: 'Auriculares Bluetooth con cancelación activa de ruido'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Producto creado exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Producto' }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/ServerError' }
        }
      }
    },
    '/api/productos/{id}': {
      get: {
        summary: 'Obtener un producto por su ID (ObjectId o Código)',
        tags: ['Productos'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID de MongoDB (ObjectId de 24 caracteres hex) o Código de Producto',
            schema: { type: 'string' },
            example: '66d5d1234567890abcdef123'
          }
        ],
        responses: {
          '200': {
            description: 'Detalle del producto encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Producto' }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' }
        }
      },
      put: {
        summary: 'Actualizar un producto existente',
        tags: ['Productos'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID de MongoDB (ObjectId) del producto a actualizar',
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductoInputPartial' },
              example: {
                precio: 82000,
                stock: 15
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Producto actualizado exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Producto' }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/ServerError' }
        }
      },
      delete: {
        summary: 'Eliminar un producto por su ID',
        tags: ['Productos'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID de MongoDB (ObjectId) del producto a eliminar',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Producto eliminado exitosamente',
            content: {
              'application/json': {
                example: {
                  mensaje: 'Producto eliminado exitosamente',
                  producto: {
                    id: '66d5d1234567890abcdef123',
                    codigo: 'PROD-100',
                    nombre: 'Auriculares Inalámbricos',
                    precio: 75000,
                    stock: 10
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/ServerError' }
        }
      }
    },
    '/api/productos/{id}/reservar': {
      post: {
        summary: 'Reservar 1 unidad de stock con Exclusión Mutua (Redis Lock + MongoDB)',
        tags: ['Concurrencia & Redis'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID de MongoDB (ObjectId) del producto a reservar',
            schema: { type: 'string' }
          },
          {
            name: 'useLock',
            in: 'query',
            required: false,
            description: 'Activa o desactiva la exclusión mutua de Redis (default: true)',
            schema: { type: 'boolean', default: true }
          }
        ],
        responses: {
          '200': {
            description: 'Reserva realizada exitosamente',
            content: {
              'application/json': {
                example: {
                  mensaje: 'Reserva realizada exitosamente (MODO CON LOCK - Exclusión Mutua)',
                  producto: {
                    id: '66d5d1234567890abcdef123',
                    nombre: 'Teclado mecánico',
                    stock: 0
                  },
                  tokenPropiedad: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': {
            description: 'Sin stock suficiente',
            content: {
              'application/json': {
                example: { error: 'Sin stock suficiente', stockActual: 0 }
              }
            }
          },
          '423': {
            description: 'Recurso bloqueado por otra operación en progreso (Lock activo en Redis)',
            content: {
              'application/json': {
                example: {
                  error: 'Recurso bloqueado por otra operación (Lock activo)',
                  lockKey: 'lock:producto:66d5d1234567890abcdef123'
                }
              }
            }
          },
          '500': { $ref: '#/components/responses/ServerError' }
        }
      }
    }
  },
  components: {
    schemas: {
      Producto: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66d5d1234567890abcdef123' },
          codigo: { type: 'string', example: 'PROD-001' },
          nombre: { type: 'string', example: 'Teclado mecánico' },
          precio: { type: 'number', example: 45000 },
          stock: { type: 'integer', example: 5 },
          categoria: { type: 'string', example: 'Periféricos' },
          descripcion: { type: 'string', example: 'Teclado mecánico RGB' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      ProductoInput: {
        type: 'object',
        required: ['nombre', 'precio', 'stock'],
        properties: {
          codigo: { type: 'string', example: 'PROD-004' },
          nombre: { type: 'string', example: 'Webcam HD 1080p' },
          precio: { type: 'number', example: 35000 },
          stock: { type: 'integer', example: 8 },
          categoria: { type: 'string', example: 'Video' },
          descripcion: { type: 'string', example: 'Cámara web Full HD' }
        }
      },
      ProductoInputPartial: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          nombre: { type: 'string' },
          precio: { type: 'number' },
          stock: { type: 'integer' },
          categoria: { type: 'string' },
          descripcion: { type: 'string' }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Solicitud incorrecta (Formato de ID de MongoDB inválido o datos de entrada incoherentes)',
        content: {
          'application/json': {
            example: { error: 'El ID proporcionado no es un ObjectId válido de MongoDB' }
          }
        }
      },
      NotFound: {
        description: 'Recurso no encontrado (ID con formato válido pero inexistente en MongoDB)',
        content: {
          'application/json': {
            example: { error: 'Producto no encontrado' }
          }
        }
      },
      Conflict: {
        description: 'Conflicto de integridad (Violación de restricción única en MongoDB)',
        content: {
          'application/json': {
            example: { error: 'Ya existe un producto con el código especificado (PROD-001)' }
          }
        }
      },
      ServerError: {
        description: 'Error interno en el servidor o en la capa de persistencia',
        content: {
          'application/json': {
            example: { error: 'Error interno del servidor' }
          }
        }
      }
    }
  }
};

export function setupSwagger(app) {
  // Ruta para obtener la especificación OpenAPI en formato JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });

  // Ruta para la interfaz de Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Documentación Swagger API REST TP3'
  }));
}
