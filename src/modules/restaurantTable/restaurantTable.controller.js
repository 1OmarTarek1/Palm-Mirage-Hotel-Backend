import { Router } from 'express';
import * as tableService from './services/restaurantTable.service.js';
import { validation } from '../../middleware/validation.middleware.js';
import {
  authentication,
  authorization,
} from '../../middleware/auth.middleware.js';

import * as validators from './restaurantTable.validation.js';
const router = Router();

router.post('/create-table', authentication(), authorization(['admin']), validation(validators.createTable), tableService.createTable);
router.get('/get-table', tableService.getTables);
router.get("/get-table/:number",validation(validators.getTableByNumber), tableService.getTableByNumber);
router.patch('/update-table/:number', authentication(), authorization(['admin']), validation(validators.updateTable), tableService.updateTable);
router.delete('/delete-table/:number', authentication(), authorization(['admin']), validation(validators.deleteTable), tableService.deleteTable);

export default router;
