# Custom Authentication Setup Guide

This guide will help you set up custom email/password authentication separate from Supabase Auth.

## Step 1: Database Migration

Run the SQL migration script to add the required columns to your `profiles` table:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the SQL from `server/migrations/add_custom_auth_columns.sql`

This will add:
- `password_hash` - Stores bcrypt hashed passwords
- `reset_token` - Stores password reset tokens
- `reset_token_expires` - Stores reset token expiration times

## Step 2: Environment Variables

Add the following to your `.env` file in the `server` directory:

```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-security
```

**Important**: Generate a strong random secret (at least 32 characters). You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Set Initial Passwords for Existing Users

For users that already exist in your database, you'll need to set their passwords. You can do this through:

1. **Via API** (after backend is running):
   - Use the password reset flow
   - Or create a script to set initial passwords

2. **Via SQL** (for testing only - not recommended for production):
   ```sql
   -- This is just an example - in production, use the API
   -- The password_hash should be generated using bcrypt
   ```

## Step 4: Backend Endpoints

The following endpoints are now available:

### Public Endpoints:
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/check-email` - Check if email exists

### Protected Endpoints:
- `GET /api/auth/me` - Get current user
- `POST /api/auth/update-password` - Update password (requires current password)
- All other existing endpoints remain the same

## Step 5: Frontend Integration

The frontend needs to be updated to use the new custom auth endpoints instead of Supabase Auth. This will be done in the next step.

## Testing

1. Start your backend server
2. Test login: `POST /api/auth/login` with `{ "email": "user@example.com", "password": "password123" }`
3. You should receive a JWT token in the response
4. Use this token in the `Authorization: Bearer <token>` header for protected routes

## Security Notes

- Passwords are hashed using bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Reset tokens expire after 1 hour
- In production, implement email sending for password reset links
- Never log or expose password hashes or reset tokens

