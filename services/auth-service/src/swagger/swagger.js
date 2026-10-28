import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Auth Service API - Identidad y Seguridad JWT',
    version: '1.0.0',
    description:
      'Documentación OpenAPI del microservicio de autenticación, alta de identidades y emisión de tokens JWT (TP7).'
  },
  servers: [
    {
      url: '/api/auth',
      description: 'Prefijo API Auth Service (vía Gateway o directo)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el Access Token JWT obtenido en /login con formato: Bearer <token>'
      }
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', example: 'nuevousuario' },
          email: { type: 'string', example: 'usuario@uch.edu.ar' },
          password: { type: 'string', example: 'Password123!' },
          role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
          nombre: { type: 'string', example: 'Juan Pérez' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@uch.edu.ar' },
          password: { type: 'string', example: 'AdminPassword123!' }
        }
      },
      UserResponse: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '671e9821f0ab9a12c8401234' },
          username: { type: 'string', example: 'admin' },
          email: { type: 'string', example: 'admin@uch.edu.ar' },
          role: { type: 'string', example: 'ADMIN' },
          nombre: { type: 'string', example: 'Administrador del Sistema' },
          activo: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2026-10-27T21:00:00.000Z' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '1h' },
          expiresAt: { type: 'string', example: '2026-10-27T22:00:00.000Z' },
          user: { $ref: '#/components/schemas/UserResponse' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Unauthorized' },
          message: { type: 'string', example: 'Credenciales inválidas.' },
          statusCode: { type: 'integer', example: 401 }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Chequeo de salud del servicio y persistencia MongoDB',
        responses: {
          '200': { description: 'Servicio en estado saludable' },
          '503': { description: 'Servicio degradado (falla en MongoDB)' }
        }
      }
    },
    '/register': {
      post: {
        summary: 'Registro o alta de una nueva identidad de usuario',
        description: 'Crea un nuevo usuario con contraseña hasheada mediante bcrypt. No expone password ni hash en la respuesta.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Usuario creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Usuario registrado exitosamente.' },
                    user: { $ref: '#/components/schemas/UserResponse' }
                  }
                }
              }
            }
          },
          '400': { description: 'Datos obligatorios faltantes o inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Email o username ya registrado (Conflicto)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '503': { description: 'Persistencia no disponible' }
        }
      }
    },
    '/login': {
      post: {
        summary: 'Autenticación mediante credenciales y emisión de Access Token JWT',
        description: 'Verifica la contraseña contra el hash almacenado y emite un JWT firmado (HS256) con claims sub, role, email y vigencia exp.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Autenticación exitosa y emisión de token JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' }
              }
            }
          },
          '400': { description: 'Faltan credenciales obligatorias', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Credenciales inválidas o cuenta inactiva (sin revelar cuál falló)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '503': { description: 'Persistencia no disponible' }
        }
      }
    },
    '/me': {
      get: {
        summary: 'Consulta de la identidad autenticada activa a partir del JWT',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Identidad recuperada a partir de los claims del token JWT',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authenticated: { type: 'boolean', example: true },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '671e9821f0ab9a12c8401234' },
                        username: { type: 'string', example: 'admin' },
                        email: { type: 'string', example: 'admin@uch.edu.ar' },
                        role: { type: 'string', example: 'ADMIN' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Token ausente, expirado o adulterado (HTTP 401 Unauthorized)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    }
  }
};

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
}
