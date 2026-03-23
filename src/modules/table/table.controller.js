import { Router } from 'express';
import * as tableService from './table.service.js';
import { validation } from '../../middleware/validation.middleware.js';
import {
  authentication,
  authorization,
} from '../../middleware/auth.middleware.js';
import * as validators from './table.validation.js';

const router = Router();

// router.post('/', authentication(), authorization(['admin']), validation(validators.createTable), tableService.createTable);
// router.get('/', tableService.getTables);
// router.get('/:id', validation(validators.getTableById), tableService.getTableById);
// router.put('/:id', authentication(), authorization(['admin']), validation(validators.updateTable), tableService.updateTable);
// router.delete('/:id', authentication(), authorization(['admin']), validation(validators.deleteTable), tableService.deleteTable);
router.post('/', validation(validators.createTable), tableService.createTable);
router.get('/', tableService.getTables);
router.get(
  '/:id',
  validation(validators.getTableById),
  tableService.getTableById
);
router.get('/number/:number', tableService.getTableByNumber);
router.put(
  '/:id',

  validation(validators.updateTable),
  tableService.updateTable
);
router.delete(
  '/:id',
  validation(validators.deleteTable),
  tableService.deleteTable
);

export default router;
