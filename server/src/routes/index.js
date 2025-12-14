import { Router } from 'express';
import authRoutes from './auth.routes.js';
import vehicleRoutes from './vehicles.routes.js';
import parkingLogRoutes from './parkingLogs.routes.js';
import complaintRoutes from './complaints.routes.js';
import uploadRoutes from './uploads.routes.js';
import reportRoutes from './reports.routes.js';
import anprRoutes from './anpr.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/parking-logs', parkingLogRoutes);
router.use('/complaints', complaintRoutes);
router.use('/uploads', uploadRoutes);
router.use('/reports', reportRoutes);
router.use('/anpr', anprRoutes);

export default router;
