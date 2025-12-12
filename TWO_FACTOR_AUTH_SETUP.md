# Two-Factor Authentication (2FA) Setup Guide

## Overview

Park Wise now includes **free** two-factor authentication (2FA) for all non-admin users. This adds an extra layer of security by requiring a code from an authenticator app in addition to your password when logging in.

## Features

✅ **Completely Free** - Uses open-source TOTP (Time-based One-Time Password) standard  
✅ **Non-Admin Only** - Admin users are exempt from 2FA requirements  
✅ **Backup Codes** - 10 one-time backup codes provided during setup  
✅ **Standard Compatible** - Works with Google Authenticator, Authy, Microsoft Authenticator, and more  
✅ **Secure** - Secrets stored encrypted in the database  

## How It Works

1. **User logs in** with email and password via Supabase Auth
2. **System checks** if user is non-admin and has 2FA enabled
3. **If 2FA is enabled**, user must enter a 6-digit code from their authenticator app
4. **After verification**, login completes and user is redirected to their dashboard

## Database Migration

Before using 2FA, you need to run the migration to add the required columns:

```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];

CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled ON profiles(two_factor_enabled) WHERE two_factor_enabled = TRUE;
```

Or use the migration file: `server/migrations/add_2fa_columns.sql`

## Backend Dependencies

The following packages are required (already installed):

- `speakeasy` - TOTP secret generation and verification
- `qrcode` - QR code generation for easy setup

## API Endpoints

### Protected Endpoints (require authentication)

- `GET /api/auth/2fa/status` - Check if 2FA is enabled for current user
- `POST /api/auth/2fa/generate` - Generate 2FA secret and QR code (non-admin only)
- `POST /api/auth/2fa/verify-setup` - Verify setup code and enable 2FA (non-admin only)
- `POST /api/auth/2fa/disable` - Disable 2FA for current user (non-admin only)

### Public Endpoint

- `POST /api/auth/verify-2fa-login` - Verify 2FA code during login

## User Flow

### Setting Up 2FA

1. User navigates to `/2fa/setup` (or is redirected there if 2FA is required)
2. User clicks "Set Up 2FA"
3. System generates a secret and displays a QR code
4. User scans QR code with authenticator app
5. User enters a 6-digit code to verify setup
6. System provides 10 backup codes (user must save these)
7. 2FA is now enabled

### Logging In with 2FA

1. User enters email and password
2. If 2FA is enabled, a verification screen appears
3. User enters 6-digit code from authenticator app (or backup code)
4. After verification, login completes

## Frontend Components

- `TwoFactorVerification.jsx` - Component shown during login when 2FA is required
- `TwoFactorSetup.jsx` - Page for users to set up or manage 2FA
- `Login.jsx` - Updated to show 2FA verification when needed

## Security Notes

- **Backup codes are one-time use** - Once used, they're removed from the database
- **Secrets are stored as base32 strings** - Not encrypted, but only accessible to authenticated users
- **2FA is required for non-admin users** - Admins can bypass 2FA
- **Codes expire after 60 seconds** - Standard TOTP window of ±2 time steps

## Testing

1. **Create a non-admin user** in Supabase
2. **Log in** with that user
3. **Navigate to `/2fa/setup`** or be redirected there
4. **Set up 2FA** using an authenticator app
5. **Log out and log back in** - you should be prompted for 2FA code
6. **Enter code** from authenticator app
7. **Login should complete** successfully

## Troubleshooting

### "2FA is not required for admin users"
- This is expected behavior - admins are exempt from 2FA

### "Invalid code"
- Make sure your device's time is synchronized
- Try entering the code again (codes refresh every 30 seconds)
- If using backup codes, make sure you haven't used them already

### "Failed to generate 2FA secret"
- Check that the database migration has been run
- Verify backend is running and can access Supabase

### QR Code not displaying
- Check browser console for errors
- Verify `qrcode` package is installed in backend

## Future Enhancements

Potential improvements:
- SMS-based 2FA (requires paid service)
- Email-based 2FA codes
- Recovery options if authenticator is lost
- Admin override for 2FA (emergency access)

