import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getCurrentUser,
  updateMe,
  listUsers,
  updateUser
} from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateMe);
router.get('/users', requireAuth, requireAdmin, listUsers);
router.patch('/users/:id', requireAuth, requireAdmin, updateUser);

export default router;
