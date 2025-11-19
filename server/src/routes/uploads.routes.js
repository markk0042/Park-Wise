import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { uploadEvidence, cleanupOldImages } from '../controllers/upload.controller.js';
import { env } from '../config/env.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/evidence', requireAuth, requireApproved, upload.single('file'), uploadEvidence);

// Cleanup endpoint - requires secret token (for cron jobs) or admin auth
const cleanupMiddleware = (req, res, next) => {
  const token = req.headers['x-cleanup-token'] || req.query.token;
  
  // Check if secret token is provided (for cron jobs)
  if (env.CLEANUP_SECRET_TOKEN && token === env.CLEANUP_SECRET_TOKEN) {
    return next();
  }
  
  // Otherwise, require admin authentication
  // First check auth, then check admin
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireAdmin(req, res, next);
  });
};

router.post('/cleanup', cleanupMiddleware, cleanupOldImages);

export default router;
