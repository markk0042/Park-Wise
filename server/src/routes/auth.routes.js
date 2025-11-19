import { Router } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import {
  getCurrentUser,
  updateMe,
  listUsers,
  updateUser,
  inviteUser,
  deleteUser
} from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateMe);
router.get('/users', requireAuth, requireAdmin, listUsers);
router.patch('/users/:id', requireAuth, requireAdmin, updateUser);
router.post('/users/invite', requireAuth, requireSuperAdmin, inviteUser);
router.delete('/users/:id', requireAuth, requireSuperAdmin, deleteUser);

export default router;
