import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class AuthService {
  /**
   * Registro público de usuarios (Consigna de Seguridad: SIEMPRE asigna rol USER).
   * Cualquier parámetro de rol enviado por el cliente es estrictamente ignorado.
   */
  static async register({ username, email, password, nombre }) {
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

    // Regla de endurecimiento de seguridad: El registro público NUNCA permite crear ADMIN
    const assignedRole = 'USER';
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
    logger.info(`[Auth] Nuevo usuario registrado con éxito: ${cleanEmail} (Rol forzado a USER)`);

    return newUser.toJSON();
  }

  /**
   * Procedimiento separado y protegido para creación de administradores (Hito de Seguridad).
   * Solo ejecutable por personal autorizado o vía endpoints restringidos a ADMIN.
   */
  static async createAdminUser({ username, email, password, nombre }) {
    if (!username || !email || !password) {
      const error = new Error('Username, email y password son obligatorios para crear un administrador.');
      error.statusCode = 400;
      throw error;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existing) {
      const error = new Error(`El usuario o email '${cleanEmail}' ya se encuentra registrado.`);
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await User.hashPassword(password, config.bcryptRounds);
    const newAdmin = new User({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: 'ADMIN',
      nombre: nombre ? String(nombre).trim() : 'Administrador',
      activo: true
    });

    await newAdmin.save();
    logger.info(`[Auth Protected] Nuevo Administrador creado mediante procedimiento protegido: ${cleanEmail}`);

    return newAdmin.toJSON();
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

    // Emisión de token JWT con claims mínimos estrictamente necesarios (Consigna de Seguridad)
    // Se excluyen claims superfluos para reducir superficie de exposición y tamaño de payload
    const payload = {
      sub: user._id.toString(),
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

  /**
   * Proceso de Bootstrap e inicialización segura:
   * Las credenciales se leen exclusivamente de variables de entorno externalizadas.
   */
  static async seedInitialUsers() {
    try {
      const adminEmail = config.adminEmail;
      const adminPassword = config.adminPassword;
      const adminUsername = config.adminUsername;
      const userPassword = config.initialUserPassword;

      // 1. Verificar o sincronizar el administrador principal externalizado
      let admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        const passwordHash = await User.hashPassword(adminPassword, config.bcryptRounds);
        admin = await User.create({
          username: adminUsername,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          nombre: 'Administrador del Sistema',
          activo: true
        });
        logger.info(`[Auth Bootstrap] Administrador inicial creado desde entorno: ${adminEmail}`);
      } else {
        // Si el admin ya existía en volumen, sincronizamos su hash con la variable de entorno
        const matches = await admin.comparePassword(adminPassword);
        if (!matches) {
          admin.passwordHash = await User.hashPassword(adminPassword, config.bcryptRounds);
          admin.role = 'ADMIN';
          await admin.save();
          logger.info(`[Auth Bootstrap] Credencial de Administrador sincronizada exitosamente.`);
        }
      }

      // 2. Verificar o sembrar usuarios clientes iniciales si no existen
      const defaultUsers = [
        {
          username: 'cliente1',
          email: 'cliente1@uch.edu.ar',
          password: userPassword,
          role: 'USER',
          nombre: 'Lucía Astorga (Cliente)',
          activo: true
        },
        {
          username: 'cliente2',
          email: 'cliente2@uch.edu.ar',
          password: userPassword,
          role: 'USER',
          nombre: 'Santiago Militello (Cliente)',
          activo: true
        },
        {
          username: 'inactivo',
          email: 'inactivo@uch.edu.ar',
          password: userPassword,
          role: 'USER',
          nombre: 'Cuenta Suspendida',
          activo: false
        }
      ];

      for (const u of defaultUsers) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
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
      }

      logger.info(`[Auth Bootstrap] Verificación de identidades completada con éxito.`);
    } catch (error) {
      logger.warn(`[Auth Bootstrap] No se pudo completar el sembrado inicial: ${error.message}`);
    }
  }
}
