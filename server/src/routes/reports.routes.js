import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getDashboardSummary } from '../controllers/report.controller.js';

const router = Router();

router.get('/dashboard-summary', requireAuth, requireAdmin, getDashboardSummary);

export default router;
