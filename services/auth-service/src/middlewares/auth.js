import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    logger.warn(`[Auth Middleware] 401 Unauthorized: Cabecera Authorization ausente en ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      service: config.serviceName,
      error: 'Unauthorized',
      message: 'Token de acceso ausente. Debe incluir Authorization: Bearer <token>',
      statusCode: 401
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn(`[Auth Middleware] 401 Unauthorized: Formato de Bearer inválido en ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      service: config.serviceName,
      error: 'Unauthorized',
      message: 'Formato de cabecera inválido. Formato esperado: Bearer <token>',
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
      logger.warn(`[Auth Middleware] 401 Unauthorized: Token expirado en ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        service: config.serviceName,
        error: 'Unauthorized',
        message: 'El token de acceso ha expirado.',
        expiredAt: err.expiredAt,
        statusCode: 401
      });
    }

    logger.warn(`[Auth Middleware] 401 Unauthorized: Firma inválida o token corrupto: ${err.message}`);
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
      logger.warn(`[Auth RBAC] 401 Unauthorized: No se encontró contexto de usuario autenticado`);
      return res.status(401).json({
        service: config.serviceName,
        error: 'Unauthorized',
        message: 'No autenticado.',
        statusCode: 401
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `[Auth RBAC] 403 Forbidden: Usuario '${req.user.email}' con rol '${req.user.role}' intentó acceder a recurso que requiere [${allowedRoles.join(', ')}]`
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
