-- Migration: Add custom authentication columns to profiles table
-- Run this SQL in your Supabase SQL Editor

-- Add password_hash column (stores bcrypt hashed passwords)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add reset_token column (stores password reset tokens)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reset_token TEXT;

-- Add reset_token_expires column (stores expiration time for reset tokens)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add index on reset_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token ON profiles(reset_token) WHERE reset_token IS NOT NULL;

-- Optional: Add a unique constraint on email if it doesn't exist
-- ALTER TABLE profiles ADD CONSTRAINT unique_email UNIQUE (email);

