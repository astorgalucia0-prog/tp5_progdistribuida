import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Endpoint público de consulta de disponibilidad de stock
router.get('/:code', InventoryController.getAvailability);

// Endpoints operacionales autenticados para compras y reservas (USER o ADMIN)
router.post('/reserve', authenticateToken, authorizeRoles('USER', 'ADMIN'), InventoryController.reserve);
router.post('/confirm', authenticateToken, authorizeRoles('USER', 'ADMIN'), InventoryController.confirm);
router.post('/release', authenticateToken, authorizeRoles('USER', 'ADMIN'), InventoryController.release);

// Endpoint administrativo restringido para ajuste físico en bodega (Solo ADMIN)
router.post('/:code/stock', authenticateToken, authorizeRoles('ADMIN'), InventoryController.adjustStock);

export default router;
