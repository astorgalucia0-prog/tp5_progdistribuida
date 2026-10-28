import { AuthService } from '../services/authService.js';
import { getIsMongoConnected } from '../database.js';
import logger from '../utils/logger.js';

function verificarPersistencia(res) {
  if (!getIsMongoConnected()) {
    logger.warn('[Auth] Petición rechazada: Base de datos MongoDB (db_auth) no disponible.');
    res.status(503).json({
      error: 'Servicio de persistencia no disponible',
      message: 'La base de datos de identidades db_auth no se encuentra disponible.'
    });
    return false;
  }
  return true;
}

export class AuthController {
  static async register(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { username, email, password, role, nombre } = req.body;
      const user = await AuthService.register({ username, email, password, role, nombre });
      res.status(201).json({
        message: 'Usuario registrado exitosamente.',
        user
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      if (!verificarPersistencia(res)) return;
      const { email, password } = req.body;
      const authResult = await AuthService.login({ email, password });
      res.status(200).json(authResult);
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      // req.user ya fue inyectado y validado por el middleware authenticateToken
      res.status(200).json({
        authenticated: true,
        user: {
          id: req.user.sub,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
