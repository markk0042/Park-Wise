import { z } from 'zod';
import { listProfiles, updateProfile } from '../services/profile.service.js';

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
