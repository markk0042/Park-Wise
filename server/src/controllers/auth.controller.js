import { z } from 'zod';
import createError from 'http-errors';
import { supabaseAdmin } from '../config/supabase.js';
import { listProfiles, updateProfile, findOrCreateProfile, deleteProfile } from '../services/profile.service.js';
import {
  authenticateUser,
  createUser,
  generateToken,
  setPasswordResetToken,
  resetPasswordWithToken,
  updatePassword as updateUserPassword,
  adminResetPassword,
} from '../services/auth.service.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

const updateMeSchema = z.object({
  full_name: z.string().min(1).optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional()
});

export const getCurrentUser = async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      full_name: req.user.full_name,
      profile: req.user.profile
    }
  });
};

export const updateMe = async (req, res, next) => {
  try {
    const parsed = updateMeSchema.parse(req.body);
    const updated = await updateProfile(req.user.id, parsed);
    res.json({ profile: updated });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (_req, res, next) => {
  try {
    const profiles = await listProfiles();
    res.json({ users: profiles });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(['user', 'admin']).optional(),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      full_name: z.string().min(1).optional()
    });
    const parsed = schema.parse(req.body);
    const updated = await updateProfile(req.params.id, parsed);
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      full_name: z.string().min(1).optional(),
      role: z.enum(['user', 'admin']).default('user'),
      status: z.enum(['pending', 'approved']).default('pending') // Default to pending - requires super admin approval
    });
    
    const parsed = schema.parse(req.body);
    
    // Invite user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      parsed.email,
      {
        data: {
          full_name: parsed.full_name || parsed.email.split('@')[0]
        }
      }
    );

    if (authError) {
      // If user already exists, that's okay - we'll just update their profile
      if (authError.message?.includes('already registered')) {
        // Get existing user
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(parsed.email);
        if (existingUser?.user) {
          // Create or update profile
          const profile = await findOrCreateProfile(existingUser.user);
          const updated = await updateProfile(existingUser.user.id, {
            role: parsed.role,
            status: parsed.status,
            full_name: parsed.full_name || profile.full_name
          });
          return res.json({ user: updated, message: 'User already exists, profile updated' });
        }
      }
      throw authError;
    }

    // Create profile for new user
    if (authData?.user) {
      const profile = await findOrCreateProfile(authData.user);
      const updated = await updateProfile(authData.user.id, {
        role: parsed.role,
        status: parsed.status,
        full_name: parsed.full_name || profile.full_name
      });
      return res.json({ user: updated, message: 'Invitation sent successfully' });
    }

    res.json({ message: 'Invitation sent successfully' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.user.id) {
      return next(createError(400, 'Cannot delete your own account'));
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Delete profile
    await deleteProfile(userId);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Check if email exists in profiles (public endpoint for password reset)
export const checkEmailExists = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email()
    });
    const { email } = schema.parse(req.body);
    
    // Check if profile exists in database directly
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !profile) {
      return res.json({ exists: false, message: 'Email not registered' });
    }
    
    res.json({ exists: true, message: 'Email found' });
  } catch (err) {
    next(err);
  }
};

// Custom login endpoint
export const login = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });
    const { email, password } = schema.parse(req.body);
    
    // Authenticate user
    const user = await authenticateUser(email, password);
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
      token
    });
  } catch (err) {
    next(createError(401, err.message || 'Authentication failed'));
  }
};

// Request password reset
export const requestPasswordReset = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email()
    });
    const { email } = schema.parse(req.body);
    
    // Set reset token
    const { reset_token, user } = await setPasswordResetToken(email);
    
    console.log(`\n🔐 Password reset requested for: ${email}`);
    console.log(`📝 Reset token generated: ${reset_token}`);
    
    // Send password reset email
    let emailSent = false;
    try {
      const emailResult = await sendPasswordResetEmail(email, reset_token);
      emailSent = emailResult?.success || false;
      if (emailResult?.devMode) {
        console.log(`📧 [DEV MODE] Email not configured - token logged above`);
      } else {
        console.log(`✅ Password reset email sent to ${email}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      console.error('   Error message:', emailError.message);
      // Still continue - token is generated and will be returned
    }
    
    // Always return token if email sending failed, or in development
    // This ensures users can still reset password even if email isn't configured
    const shouldReturnToken = process.env.NODE_ENV === 'development' || !emailSent;
    
    // ALWAYS log the token to console for debugging/admin use
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 PASSWORD RESET TOKEN GENERATED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Token: ${reset_token}`);
    const resetLink = `${process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://park-wise-two.vercel.app' : 'http://localhost:5173')}/login?token=${reset_token}`;
    console.log(`🔗 Reset Link: ${resetLink}`);
    console.log(`⏰ Expires: 1 hour from now`);
    console.log(`📤 Email sent: ${emailSent ? 'YES' : 'NO'}`);
    console.log(`🔑 Token in response: ${shouldReturnToken ? 'YES' : 'NO'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    res.json({
      message: emailSent 
        ? 'Password reset link has been sent to your email'
        : 'If the email exists, a password reset link has been sent to your email',
      // Return token in development or if email sending failed
      reset_token: shouldReturnToken ? reset_token : undefined
    });
  } catch (err) {
    // Log error for debugging
    console.error('\n❌ Password reset request error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      status: err.status || err.statusCode,
      email: req.body?.email
    });
    
    // Check if it's a "user not found" error
    if (err.message?.includes('User not found') || err.message?.includes('not found')) {
      console.log('⚠️  Email not found in database:', req.body?.email);
      // Don't reveal if email exists (security), but log it for debugging
    }
    
    // Don't reveal if email exists or not (security best practice)
    res.json({
      message: 'If the email exists, a password reset link has been sent'
    });
  }
};

// Reset password with token
export const resetPassword = async (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string(),
      password: z.string().min(6)
    });
    const { token, password } = schema.parse(req.body);
    
    // Reset password
    const user = await resetPasswordWithToken(token, password);
    
    res.json({
      message: 'Password has been reset successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      }
    });
  } catch (err) {
    next(createError(400, err.message || 'Failed to reset password'));
  }
};

// Update password (for authenticated users)
export const updatePassword = async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6)
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    
    const user = await updateUserPassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      message: 'Password updated successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      }
    });
  } catch (err) {
    next(createError(400, err.message || 'Failed to update password'));
  }
};

// Admin reset user password (no current password required)
export const adminResetUserPassword = async (req, res, next) => {
  try {
    console.log('🔐 Admin reset password request:', {
      userId: req.params.id,
      body: req.body,
      bodyType: typeof req.body.password
    });
    
    const schema = z.object({
      password: z.string().min(6, 'Password must be at least 6 characters long')
    });
    
    // Validate request body
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors);
      const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(createError(400, `Validation error: ${errorMessages}`));
    }
    
    const { password } = validationResult.data;
    const userId = req.params.id;
    
    if (!userId) {
      return next(createError(400, 'User ID is required'));
    }
    
    console.log('✅ Validation passed, resetting password for user:', userId);
    
    // Allow admins to reset their own password or any other user's password
    const user = await adminResetPassword(userId, password);
    
    console.log('✅ Password reset successful for user:', user.email);
    
    res.json({
      message: 'User password has been reset successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      }
    });
  } catch (err) {
    console.error('❌ Error in adminResetUserPassword:', {
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
    // Check if it's a known error type
    if (err.message === 'User not found') {
      return next(createError(404, err.message));
    }
    if (err.code === 'PGRST116') {
      return next(createError(404, 'User not found'));
    }
    next(createError(400, err.message || 'Failed to reset user password'));
  }
};
