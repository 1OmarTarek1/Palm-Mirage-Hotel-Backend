import { Router } from 'express';
import * as tableService from './services/restaurantTable.service.js';
import { validation } from '../../middleware/validation.middleware.js';
import {
  authentication,
  authorization,
} from '../../middleware/auth.middleware.js';

import * as validators from './restaurantTable.validation.js';
const router = Router();

router.post('/add-table', authentication(), authorization(['admin']), validation(validators.createTable), tableService.createTable);
router.get('/get-table', tableService.getTables);
router.put('/:number', authentication(), authorization(['admin']), validation(validators.updateTable), tableService.updateTable);
router.delete('/:number', authentication(), authorization(['admin']), validation(validators.deleteTable), tableService.deleteTable);

export default router;
