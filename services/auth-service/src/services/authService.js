import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class AuthService {
  static async register({ username, email, password, role, nombre }) {
    if (!username || !email || !password) {
      const error = new Error('Username, email y password son datos obligatorios.');
      error.statusCode = 400;
      throw error;
    }

    if (typeof password !== 'string' || password.length < 6) {
      const error = new Error('La contraseña debe contener al menos 6 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    // Verificación de duplicados (Consigna 6.2 e Hito 2)
    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existing) {
      const isEmailDup = existing.email === cleanEmail;
      const error = new Error(
        isEmailDup
          ? `El email '${cleanEmail}' ya se encuentra registrado.`
          : `El nombre de usuario '${cleanUsername}' ya está en uso.`
      );
      error.statusCode = 409;
      throw error;
    }

    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
    const passwordHash = await User.hashPassword(password, config.bcryptRounds);

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: assignedRole,
      nombre: nombre ? String(nombre).trim() : '',
      activo: true
    });

    await newUser.save();
    logger.info(`[Auth] Nuevo usuario registrado con éxito: ${cleanEmail} (Rol: ${assignedRole})`);

    return newUser.toJSON();
  }

  static async login({ email, password }) {
    if (!email || !password) {
      const error = new Error('Credenciales obligatorias: se requiere email/username y contraseña.');
      error.statusCode = 400;
      throw error;
    }

    const identifier = String(email).trim().toLowerCase();

    // Búsqueda por email o username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      logger.warn(`[Auth] Intento de login fallido: usuario no localizado para identificador '${identifier}'`);
      const error = new Error('Credenciales inválidas.');
      error.statusCode = 401;
      throw error;
    }

    if (!user.activo) {
      logger.warn(`[Auth] Intento de login rechazado: cuenta inactiva o deshabilitada para '${identifier}'`);
      const error = new Error('Cuenta deshabilitada. Contacte al administrador.');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`[Auth] Intento de login fallido: contraseña incorrecta para '${identifier}'`);
      const error = new Error('Credenciales inválidas.');
      error.statusCode = 401;
      throw error;
    }

    // Emisión de token JWT firmado (Consigna 8)
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
      issuer: config.jwtIssuer
    });

    // Decodificar token para obtener iat y exp exactos
    const decoded = jwt.decode(token);

    logger.info(`[Auth] Login exitoso: usuario '${user.email}' autenticado con rol '${user.role}'`);

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      user: user.toJSON()
    };
  }

  static async seedInitialUsers() {
    try {
      const count = await User.countDocuments();
      if (count > 0) {
        logger.info(`[Auth Seed] Base de datos db_auth ya contiene ${count} usuario(s). Omite sembrado.`);
        return;
      }

      logger.info('[Auth Seed] Sembrando identidades iniciales del sistema...');

      const defaultUsers = [
        {
          username: 'admin',
          email: 'admin@uch.edu.ar',
          password: 'AdminPassword123!',
          role: 'ADMIN',
          nombre: 'Administrador del Sistema',
          activo: true
        },
        {
          username: 'cliente1',
          email: 'cliente1@uch.edu.ar',
          password: 'UserPassword123!',
          role: 'USER',
          nombre: 'Lucía Astorga (Cliente)',
          activo: true
        },
        {
          username: 'cliente2',
          email: 'cliente2@uch.edu.ar',
          password: 'UserPassword123!',
          role: 'USER',
          nombre: 'Santiago Militello (Cliente)',
          activo: true
        },
        {
          username: 'inactivo',
          email: 'inactivo@uch.edu.ar',
          password: 'UserPassword123!',
          role: 'USER',
          nombre: 'Cuenta Suspendida',
          activo: false
        }
      ];

      for (const u of defaultUsers) {
        const passwordHash = await User.hashPassword(u.password, config.bcryptRounds);
        await User.create({
          username: u.username,
          email: u.email,
          passwordHash,
          role: u.role,
          nombre: u.nombre,
          activo: u.activo
        });
      }

      logger.info(`[Auth Seed] Se sembraron exitosamente ${defaultUsers.length} identidades iniciales.`);
    } catch (error) {
      logger.warn(`[Auth Seed] No se pudo completar el sembrado inicial: ${error.message}`);
    }
  }
}
