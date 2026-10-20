import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController.js';

const router = Router();

router.post('/', OrdersController.create);
router.get('/:order_id', OrdersController.getById);
router.get('/customer/:customer_id', OrdersController.getByCustomer);
router.post('/:order_id/confirm', OrdersController.confirm);
router.post('/:order_id/cancel', OrdersController.cancel);

export default router;
