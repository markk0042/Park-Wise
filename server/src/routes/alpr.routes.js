import { Router } from 'express';
import { processALPR, getALPRHealth } from '../controllers/alpr.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Health check (public)
router.get('/health', getALPRHealth);

// Process ALPR image (requires authentication)
router.post('/process', requireAuth, processALPR);

export default router;

