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
  adminResetUserPassword,
  generate2FASecret,
  verify2FASetup,
  verify2FALogin,
  check2FAStatus,
  disable2FA,
} from '../controllers/auth.controller.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/check-email', checkEmailExists); // Public endpoint for password reset
router.post('/verify-2fa-login', verify2FALogin); // Public endpoint for 2FA verification during login

// Protected routes
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateMe);
router.post('/update-password', requireAuth, updatePassword);
router.get('/users', requireAuth, requireAdmin, listUsers);
router.patch('/users/:id', requireAuth, requireAdmin, updateUser);
router.post('/users/:id/reset-password', requireAuth, requireAdmin, adminResetUserPassword);
router.post('/users/invite', requireAuth, requireSuperAdmin, inviteUser);
router.delete('/users/:id', requireAuth, requireSuperAdmin, deleteUser);

// 2FA routes (protected)
router.get('/2fa/status', requireAuth, check2FAStatus);
router.post('/2fa/generate', requireAuth, generate2FASecret);
router.post('/2fa/verify-setup', requireAuth, verify2FASetup);
router.post('/2fa/disable', requireAuth, disable2FA);

export default router;
