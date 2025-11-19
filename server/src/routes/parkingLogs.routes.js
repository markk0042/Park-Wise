import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getParkingLogs,
  postParkingLog,
  removeParkingLog
} from '../controllers/parkingLog.controller.js';

const router = Router();

router.get('/', requireAuth, getParkingLogs);
router.post('/', requireAuth, requireAdmin, postParkingLog);
router.delete('/:id', requireAuth, requireAdmin, removeParkingLog);

export default router;
