import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    logger.warn(`[Catalog Auth] 401 Unauthorized: Token ausente en ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      service: config.serviceName,
      error: 'Unauthorized',
      message: 'Token de acceso ausente. Debe incluir cabecera Authorization: Bearer <token>',
      statusCode: 401
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn(`[Catalog Auth] 401 Unauthorized: Formato de cabecera inválido en ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      service: config.serviceName,
      error: 'Unauthorized',
      message: 'Formato de cabecera inválido. Debe ser: Bearer <token>',
      statusCode: 401
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.warn(`[Catalog Auth] 401 Unauthorized: Token expirado en ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        service: config.serviceName,
        error: 'Unauthorized',
        message: 'El token de acceso ha expirado.',
        expiredAt: err.expiredAt,
        statusCode: 401
      });
    }

    logger.warn(`[Catalog Auth] 401 Unauthorized: Firma de token inválida en ${req.method} ${req.originalUrl}: ${err.message}`);
    return res.status(401).json({
      service: config.serviceName,
      error: 'Unauthorized',
      message: 'Firma de token inválida o token adulterado.',
      statusCode: 401
    });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      logger.warn(`[Catalog RBAC] 401 Unauthorized: Contexto de autenticación no encontrado`);
      return res.status(401).json({
        service: config.serviceName,
        error: 'Unauthorized',
        message: 'No autenticado.',
        statusCode: 401
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `[Catalog RBAC] 403 Forbidden: Usuario '${req.user.email}' (Rol: ${req.user.role}) intentó acceder a recurso ADMIN`
      );
      return res.status(403).json({
        service: config.serviceName,
        error: 'Forbidden',
        message: `Acceso denegado: permisos insuficientes para ejecutar esta operación. Requiere rol [${allowedRoles.join(', ')}].`,
        statusCode: 403
      });
    }

    next();
  };
}
