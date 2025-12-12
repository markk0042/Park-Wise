import { Router } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import {
  getCurrentUser,
  updateMe,
  listUsers,
  updateUser,
  inviteUser,
  deleteUser,
  checkEmailExists,
  login,
  requestPasswordReset,
  resetPassword,
  updatePassword,
  adminResetUserPassword
} from '../controllers/auth.controller.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/check-email', checkEmailExists); // Public endpoint for password reset

// Protected routes
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateMe);
router.post('/update-password', requireAuth, updatePassword);
router.get('/users', requireAuth, requireAdmin, listUsers);
router.patch('/users/:id', requireAuth, requireAdmin, updateUser);
router.post('/users/:id/reset-password', requireAuth, requireAdmin, adminResetUserPassword);
router.post('/users/invite', requireAuth, requireSuperAdmin, inviteUser);
router.delete('/users/:id', requireAuth, requireSuperAdmin, deleteUser);

export default router;
