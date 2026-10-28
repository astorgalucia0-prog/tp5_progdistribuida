import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Endpoints públicos de consulta (Hito 1)
router.get('/products', CatalogController.list);
router.get('/products/:code', CatalogController.getByCode);
router.get('/categories', CatalogController.getCategories);

// Endpoints administrativos protegidos con RBAC: Solo ADMIN (Hito 3)
router.post('/products', authenticateToken, authorizeRoles('ADMIN'), CatalogController.create);
router.put('/products/:code', authenticateToken, authorizeRoles('ADMIN'), CatalogController.update);
router.delete('/products/:code', authenticateToken, authorizeRoles('ADMIN'), CatalogController.delete);

export default router;
