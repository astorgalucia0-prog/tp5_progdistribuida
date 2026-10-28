import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Todas las operaciones de órdenes requieren usuario autenticado (USER o ADMIN)
router.use(authenticateToken, authorizeRoles('USER', 'ADMIN'));

router.post('/', OrdersController.create);
router.get('/:order_id', OrdersController.getById);
router.get('/customer/:customer_id', OrdersController.getByCustomer);
router.post('/:order_id/confirm', OrdersController.confirm);
router.post('/:order_id/cancel', OrdersController.cancel);

export default router;
