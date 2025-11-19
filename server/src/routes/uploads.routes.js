import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireApproved } from '../middleware/auth.js';
import { uploadEvidence } from '../controllers/upload.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/evidence', requireAuth, requireApproved, upload.single('file'), uploadEvidence);

export default router;
