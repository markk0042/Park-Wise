# 2FA Database Setup - Required Migration

## Error: 500 Internal Server Error

If you're seeing a 500 error when trying to generate a 2FA secret, it's likely because the database migration hasn't been run yet.

## Quick Fix

### Step 1: Run the Migration

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `server/migrations/add_2fa_columns.sql`:

```sql
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
```

5. Click **Run** to execute the migration

### Step 2: Verify the Migration

After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE 'two_factor%';
```

You should see:
- `two_factor_secret` (text)
- `two_factor_enabled` (boolean)
- `two_factor_backup_codes` (text[])

### Step 3: Test 2FA

After running the migration, try setting up 2FA again. The error should be resolved.

## Alternative: Check Migration File

The migration file is located at:
```
server/migrations/add_2fa_columns.sql
```

You can also read it directly and run it in Supabase SQL Editor.

## Troubleshooting

### Error: "column does not exist"
- **Solution**: Run the migration above

### Error: "permission denied"
- **Solution**: Make sure you're using the Supabase Dashboard SQL Editor (has admin privileges)

### Error: "relation profiles does not exist"
- **Solution**: Your profiles table hasn't been created. Run the initial migration first: `server/migrations/001_init.sql`

## What This Migration Does

1. **Adds `two_factor_secret`** - Stores the TOTP secret (base32 encoded)
2. **Adds `two_factor_enabled`** - Boolean flag indicating if 2FA is active
3. **Adds `two_factor_backup_codes`** - Array of hashed backup codes (one-time use)
4. **Creates an index** - For faster queries on enabled 2FA users

## After Migration

Once the migration is complete:
- ✅ Users can generate 2FA secrets
- ✅ Users can enable 2FA
- ✅ Users can verify 2FA codes
- ✅ Backup codes will be stored securely

