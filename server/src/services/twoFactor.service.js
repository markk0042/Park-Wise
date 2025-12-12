import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

const PROFILE_TABLE = 'profiles';

/**
 * Generate a new 2FA secret for a user
 * @param {string} userId - User ID
 * @param {string} userEmail - User email (for QR code label)
 * @returns {Promise<{secret: string, qrCodeUrl: string, backupCodes: string[]}>}
 */
export const generateTwoFactorSecret = async (userId, userEmail) => {
  // Generate a secret
  const secret = speakeasy.generateSecret({
    name: `Park Wise (${userEmail})`,
    issuer: 'Park Wise',
    length: 32,
  });

  // Generate backup codes (10 codes, 8 characters each)
  const backupCodes = Array.from({ length: 10 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Hash backup codes before storing
  const hashedBackupCodes = backupCodes.map(code => 
    crypto.createHash('sha256').update(code).digest('hex')
  );

  // Store the secret and backup codes in the database (but don't enable yet)
  const { error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      two_factor_secret: secret.base32, // Store as base32 string
      two_factor_backup_codes: hashedBackupCodes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to store 2FA secret: ${error.message}`);
  }

  // Generate QR code URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes, // Return plain codes only once - user must save them
  };
};

/**
 * Verify a 2FA code
 * @param {string} userId - User ID
 * @param {string} code - 6-digit TOTP code or backup code
 * @returns {Promise<boolean>}
 */
export const verifyTwoFactorCode = async (userId, code) => {
  // Get user's 2FA secret
  const { data: user, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('two_factor_secret, two_factor_backup_codes')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  if (!user.two_factor_secret) {
    throw new Error('2FA not set up for this user');
  }

  // Check if it's a backup code
  if (user.two_factor_backup_codes && Array.isArray(user.two_factor_backup_codes)) {
    const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
    const backupCodeIndex = user.two_factor_backup_codes.findIndex(
      hashedCode => hashedCode === codeHash
    );

    if (backupCodeIndex !== -1) {
      // Valid backup code - remove it (one-time use)
      const updatedBackupCodes = [...user.two_factor_backup_codes];
      updatedBackupCodes.splice(backupCodeIndex, 1);

      await supabaseAdmin
        .from(PROFILE_TABLE)
        .update({
          two_factor_backup_codes: updatedBackupCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return true;
    }
  }

  // Verify TOTP code
  const verified = speakeasy.totp.verify({
    secret: user.two_factor_secret,
    encoding: 'base32',
    token: code,
    window: 2, // Allow codes from ±2 time steps (60 seconds)
  });

  return verified;
};

/**
 * Enable 2FA for a user (after they've verified the setup)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const enableTwoFactor = async (userId) => {
  const { error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      two_factor_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to enable 2FA: ${error.message}`);
  }
};

/**
 * Disable 2FA for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const disableTwoFactor = async (userId) => {
  const { error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to disable 2FA: ${error.message}`);
  }
};

/**
 * Check if user has 2FA enabled
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const isTwoFactorEnabled = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('two_factor_enabled')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.two_factor_enabled === true;
};

