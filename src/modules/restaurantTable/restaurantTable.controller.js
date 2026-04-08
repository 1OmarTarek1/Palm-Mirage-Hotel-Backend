import { Router } from 'express';
import * as tableService from './services/restaurantTable.service.js';
import { validation } from '../../middleware/validation.middleware.js';
import {
  authentication,
  authorization,
} from '../../middleware/auth.middleware.js';

import * as validators from './restaurantTable.validation.js';
import { publicShortCache } from '../../middleware/httpCache.middleware.js';
const router = Router();
const catalogCache = publicShortCache(30, 90);

router.post('/create-table', authentication(), authorization(['admin']), validation(validators.createTable), tableService.createTable);
router.get('/get-table', catalogCache, tableService.getTables);
router.get("/get-table/:number", catalogCache, validation(validators.getTableByNumber), tableService.getTableByNumber);
router.patch('/update-table/:number', authentication(), authorization(['admin']), validation(validators.updateTable), tableService.updateTable);
router.delete('/delete-table/:number', authentication(), authorization(['admin']), validation(validators.deleteTable), tableService.deleteTable);

export default router;
