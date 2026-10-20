import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController.js';

const router = Router();

router.get('/products', CatalogController.list);
router.get('/products/:code', CatalogController.getByCode);
router.post('/products', CatalogController.create);
router.put('/products/:code', CatalogController.update);
router.delete('/products/:code', CatalogController.delete);
router.get('/categories', CatalogController.getCategories);

export default router;
