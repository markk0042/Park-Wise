import createError from 'http-errors';
import { supabaseAnon } from '../config/supabase.js';
import { findOrCreateProfile } from '../services/profile.service.js';
import { verifyToken, findUserById } from '../services/auth.service.js';

const parseToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer') return null;
  return token;
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = parseToken(req);
    if (!token) {
      return next(createError(401, 'Missing authorization token'));
    }

    // Try custom JWT token first
    try {
      const decoded = verifyToken(token);
      const user = await findUserById(decoded.id);

      if (!user) {
        throw new Error('User not found');
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        full_name: user.full_name,
        profile: user,
      };

      return next();
    } catch (jwtError) {
      // If JWT verification fails, try Supabase token (for backward compatibility)
      const { data, error } = await supabaseAnon.auth.getUser(token);
      if (error || !data?.user) {
        return next(createError(401, 'Invalid or expired token'));
      }

      const profile = await findOrCreateProfile(data.user);

      req.user = {
        ...data.user,
        profile,
        role: profile.role,
        status: profile.status,
        full_name: profile.full_name,
      };

      return next();
    }
  } catch (err) {
    next(createError(401, err.message || 'Unauthorized'));
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(createError(403, 'Admin access required'));
  }
  next();
};

export const requireApproved = (req, res, next) => {
  if (req.user?.status !== 'approved') {
    return next(createError(403, 'Approved account required'));
  }
  next();
};

// Super admin check - only the specified email can perform super admin actions
export const requireSuperAdmin = (req, res, next) => {
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || '';
  
  if (!SUPER_ADMIN_EMAIL) {
    return next(createError(500, 'Super admin email not configured'));
  }
  
  if (req.user?.email !== SUPER_ADMIN_EMAIL) {
    return next(createError(403, 'Super admin access required'));
  }
  
  next();
};
