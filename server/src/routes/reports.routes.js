import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getDashboardSummary, sendReport } from '../controllers/report.controller.js';

const router = Router();

router.get('/dashboard-summary', requireAuth, requireAdmin, getDashboardSummary);
router.post('/send', requireAuth, requireAdmin, sendReport);

export default router;
