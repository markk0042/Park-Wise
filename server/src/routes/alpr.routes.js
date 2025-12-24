import { Router } from 'express';
import { processALPR, getALPRHealth } from '../controllers/alpr.controller.js';
import { requireAuth, requireApproved } from '../middleware/auth.js';

const router = Router();

// Health check (public)
router.get('/health', getALPRHealth);

// Process ALPR image (requires approved user)
router.post('/process', requireAuth, requireApproved, processALPR);

export default router;

