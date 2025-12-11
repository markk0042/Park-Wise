import { z } from 'zod';
import createError from 'http-errors';
import { supabaseAdmin } from '../config/supabase.js';
import { listProfiles, updateProfile, findOrCreateProfile, deleteProfile } from '../services/profile.service.js';

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
    
    // Check if user exists in auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (!authUser?.user) {
      return res.json({ exists: false, message: 'Email not found' });
    }
    
    // Check if profile exists
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('id', authUser.user.id)
      .single();
    
    if (error || !profile) {
      return res.json({ exists: false, message: 'Email not registered' });
    }
    
    res.json({ exists: true, message: 'Email found' });
  } catch (err) {
    next(err);
  }
};
