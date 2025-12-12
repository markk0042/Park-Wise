-- Add 2FA columns to profiles table
-- This migration adds support for TOTP-based two-factor authentication

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled ON profiles(two_factor_enabled) WHERE two_factor_enabled = TRUE;

-- Add comment
COMMENT ON COLUMN profiles.two_factor_secret IS 'TOTP secret for 2FA (encrypted/hashed)';
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.two_factor_backup_codes IS 'Backup codes for 2FA recovery (hashed)';

