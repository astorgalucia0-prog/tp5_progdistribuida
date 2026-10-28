import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Endpoints públicos de identidad (Consigna 6.2 y 7)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Endpoint autenticado de verificación de identidad actual
router.get('/me', authenticateToken, AuthController.me);

export default router;
