import { Router } from 'express';
import {
  createBooking,
  getAvailableTables,
  cancelBooking,
} from './services/booking.service.js';
import { validation } from '../../middleware/validation.middleware.js';
import { authentication } from '../../middleware/auth.middleware.js';
import * as validators from './booking.validation.js';

const router = Router();

router.post(
  '/book',
  authentication(),
  validation(validators.createBooking),
  createBooking
);

router.get(
  '/available-tables',
  validation(validators.getAvailableTables),
  getAvailableTables
);
router.delete('/cancel/:number', authentication(), cancelBooking);
export default router;
