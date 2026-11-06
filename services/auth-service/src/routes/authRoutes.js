import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Endpoints públicos de identidad (Consigna 6.2 y 7)
// NOTA DE SEGURIDAD: El registro público siempre asigna rol USER
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Endpoint autenticado de verificación de identidad actual
router.get('/me', authenticateToken, AuthController.me);

// Procedimiento separado y protegido para alta de administradores (solo accesible por ADMIN autenticado)
router.post('/admin/users', authenticateToken, authorizeRoles('ADMIN'), AuthController.createAdmin);

export default router;
