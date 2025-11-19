import { Router } from 'express';
import { requireAuth, requireAdmin, requireApproved } from '../middleware/auth.js';
import {
  getComplaints,
  postComplaint,
  patchComplaint,
  removeComplaint,
  bulkRemoveComplaints
} from '../controllers/complaint.controller.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, getComplaints);
router.post('/', requireAuth, requireApproved, postComplaint);
router.patch('/:id', requireAuth, requireAdmin, patchComplaint);
router.delete('/:id', requireAuth, requireAdmin, removeComplaint);
router.post('/bulk-delete', requireAuth, requireAdmin, bulkRemoveComplaints);

export default router;
