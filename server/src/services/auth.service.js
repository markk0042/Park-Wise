import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

const PROFILE_TABLE = 'profiles';
const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // Token expires in 24 hours for improved security
const RESET_TOKEN_EXPIRES_IN = 3600000; // 1 hour in milliseconds

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate a JWT token for a user
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate a password reset token
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email) => {
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
};

/**
 * Find user by ID
 */
export const findUserById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Create a new user with password
 */
export const createUser = async (userData) => {
  const { email, password, full_name, role = 'user', status = 'pending' } = userData;

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash the password
  const password_hash = await hashPassword(password);

  // Generate a unique ID (you can use UUID or a simple ID)
  const id = crypto.randomUUID();

  const newUser = {
    id,
    email: email.toLowerCase(),
    password_hash,
    full_name: full_name || email.split('@')[0],
    role,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .insert(newUser)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  // Don't return the password hash
  const { password_hash: _, ...userWithoutPassword } = data;
  return userWithoutPassword;
};

/**
 * Authenticate user with email and password
 */
export const authenticateUser = async (email, password) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user has a password_hash (for users created before custom auth)
  if (!user.password_hash) {
    throw new Error('Password not set. Please contact administrator to set your password.');
  }

  // Compare passwords
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Check if user is approved
  if (user.status !== 'approved') {
    throw new Error(`Account is ${user.status}. Please contact administrator.`);
  }

  // Don't return the password hash
  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Set password reset token for user
 */
export const setPasswordResetToken = async (email) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error('User not found');
  }

  const reset_token = generateResetToken();
  const reset_token_expires = new Date(Date.now() + RESET_TOKEN_EXPIRES_IN).toISOString();

  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      reset_token,
      reset_token_expires,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return { reset_token, user: data };
};

/**
 * Reset password using reset token
 */
export const resetPasswordWithToken = async (reset_token, new_password) => {
  const { data: user, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('*')
    .eq('reset_token', reset_token)
    .single();

  if (error || !user) {
    throw new Error('Invalid or expired reset token');
  }

  // Check if token has expired
  if (new Date(user.reset_token_expires) < new Date()) {
    throw new Error('Reset token has expired');
  }

  // Hash the new password
  const password_hash = await hashPassword(new_password);

  // Update password and clear reset token
  const { data, error: updateError } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      password_hash,
      reset_token: null,
      reset_token_expires: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  const { password_hash: _, reset_token: __, reset_token_expires: ___, ...userWithoutSensitive } = data;
  return userWithoutSensitive;
};

/**
 * Update user password (for authenticated users)
 */
export const updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await findUserById(userId);

  if (!user || !user.password_hash) {
    throw new Error('User not found or password not set');
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash the new password
  const password_hash = await hashPassword(newPassword);

  // Update password
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      password_hash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const { password_hash: _, ...userWithoutPassword } = data;
  return userWithoutPassword;
};

/**
 * Admin reset user password (no current password required)
 * Only admins can use this to reset any user's password
 */
export const adminResetPassword = async (userId, newPassword) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Hash the new password
  const password_hash = await hashPassword(newPassword);

  // Update password and clear any existing reset tokens
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      password_hash,
      reset_token: null,
      reset_token_expires: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const { password_hash: _, reset_token: __, reset_token_expires: ___, ...userWithoutSensitive } = data;
  return userWithoutSensitive;
};

