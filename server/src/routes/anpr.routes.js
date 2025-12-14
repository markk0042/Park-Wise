import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { processANPR, getANPRHealth } from '../controllers/anpr.controller.js';

const router = Router();

// Health check (public, but could be protected)
router.get('/health', getANPRHealth);

// Process ANPR image (requires authentication)
router.post('/process', requireAuth, processANPR);

export default router;

