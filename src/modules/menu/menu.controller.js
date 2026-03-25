import { Router } from 'express';
import {
  createMenuItem,
  getMenu,
  getMenuItemsByCategory,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} from './service/menu.service.js';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from './service/category.service.js';
import { uploadFile as upload } from '../../utils/multer/cloud.multer.js';
const router = Router();

// Menu Item Routes
router.post('/item', upload.single('image'), createMenuItem);
router.get('/', getMenu);
router.get('/item/category/:categoryId', getMenuItemsByCategory);
router.get('/item/:id', getMenuItemById);
router.put('/item/:id', upload.single('image'), updateMenuItem);
router.delete('/item/:id', deleteMenuItem);

// Category Routes
router.post('/category', upload.single('heroImg'), createCategory);
router.get('/categories', getCategories);
router.get('/category/:id', getCategoryById);
router.put('/category/:id', upload.single('heroImg'), updateCategory);
router.delete('/category/:id', deleteCategory);

export default router;
