import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController.js';

const router = Router();

router.get('/:code', InventoryController.getAvailability);
router.post('/reserve', InventoryController.reserve);
router.post('/confirm', InventoryController.confirm);
router.post('/release', InventoryController.release);
router.post('/:code/stock', InventoryController.adjustStock);

export default router;
