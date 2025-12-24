import { Router } from 'express';
import { requireAuth, requireAdmin, requireApproved } from '../middleware/auth.js';
import {
  getParkingLogs,
  postParkingLog,
  removeParkingLog
} from '../controllers/parkingLog.controller.js';

const router = Router();

router.get('/', requireAuth, getParkingLogs);
router.post('/', requireAuth, requireApproved, postParkingLog); // Allow all approved users to log vehicles
router.delete('/:id', requireAuth, requireAdmin, removeParkingLog);

export default router;
