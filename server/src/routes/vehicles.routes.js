import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getVehicles,
  postVehicle,
  patchVehicle,
  removeVehicle,
  removeAllVehicles,
  bulkUploadVehicles,
  updateAllParkingTypes
} from '../controllers/vehicle.controller.js';

const router = Router();

router.get('/', requireAuth, getVehicles);
router.post('/', requireAuth, requireAdmin, postVehicle);
router.patch('/:id', requireAuth, requireAdmin, patchVehicle);
router.delete('/:id', requireAuth, requireAdmin, removeVehicle);
router.delete('/', requireAuth, requireAdmin, removeAllVehicles);
router.post('/bulk', requireAuth, requireAdmin, bulkUploadVehicles);
router.post('/update-parking-types', requireAuth, requireAdmin, updateAllParkingTypes);

export default router;
