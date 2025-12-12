# Admin Guide: Managing User Emails and Passwords

This guide explains how to manage user accounts, emails, and passwords as an administrator.

## Important: Authentication Architecture

**Passwords are NOT stored locally** - they are stored securely in the database (Supabase) as bcrypt hashes. This means:

- ✅ **Works for mobile apps**: The authentication system is API-based, so it works seamlessly with both web and mobile applications
- ✅ **Secure**: Passwords are never stored on the device, only JWT tokens for session management
- ✅ **Admin control**: Admins can reset any user's password directly via API endpoints
- ✅ **Centralized**: All user authentication is managed through the backend API

The mobile app will use the same API endpoints (`/api/auth/login`, `/api/auth/reset-password`, etc.) as the web application.

## Table of Contents
1. [Setting Initial Passwords](#setting-initial-passwords)
2. [Resetting User Passwords](#resetting-user-passwords)
3. [Changing User Emails](#changing-user-emails)
4. [Creating New Users](#creating-new-users)
5. [Managing User Status](#managing-user-status)
6. [API Endpoints Reference](#api-endpoints-reference)

---

## Setting Initial Passwords

When you create a new user or need to set a password for an existing user:

### Method 1: Via Password Reset Flow (Recommended)

1. **Request Password Reset for User:**
   ```bash
   POST /api/auth/request-password-reset
   Body: { "email": "user@example.com" }
   ```

2. **Get the Reset Token:**
   - In development, the API returns the `reset_token` in the response
   - In production, the token should be sent via email (you'll need to implement email sending)

3. **Use the Reset Token:**
   ```bash
   POST /api/auth/reset-password
   Body: {
     "token": "<reset_token>",
     "password": "newSecurePassword123"
   }
   ```

### Method 2: Via Direct Database Update (Advanced - Not Recommended)

⚠️ **Warning**: This method requires direct database access and should only be used in emergencies.

1. Generate a bcrypt hash for the password:
   ```javascript
   const bcrypt = require('bcrypt');
   const hash = await bcrypt.hash('yourPassword', 10);
   ```

2. Update the database:
   ```sql
   UPDATE profiles 
   SET password_hash = '<generated_hash>',
       updated_at = NOW()
   WHERE email = 'user@example.com';
   ```

---

## Resetting User Passwords

### When a User Forgets Their Password

1. **User Requests Reset:**
   - User goes to login page
   - Clicks "Forgot your password?"
   - Enters their email address

2. **System Generates Reset Token:**
   - Backend creates a reset token (valid for 1 hour)
   - Token is stored in `profiles.reset_token`
   - Expiration stored in `profiles.reset_token_expires`

3. **Send Reset Link:**
   - In production, implement email sending with link:
     ```
     https://yourapp.com/login?token=<reset_token>
     ```
   - In development, the token is returned in the API response

4. **User Resets Password:**
   - User clicks link and enters new password
   - System validates token and updates password
   - Token is cleared after successful reset

### Manual Password Reset (Admin)

#### Method 1: Direct Admin Reset (Recommended)

As an admin, you can directly reset any user's password without needing a reset token:

```bash
POST /api/auth/users/:userId/reset-password
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "password": "newPassword123"
}
```

**Example:**
```bash
POST /api/auth/users/123e4567-e89b-12d3-a456-426614174000/reset-password
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "password": "SecurePassword123"
}
```

**Note**: Admins cannot reset their own password using this endpoint. Use `/api/auth/update-password` instead.

#### Method 2: Via Password Reset Token Flow

If you prefer the token-based approach:

1. **Request reset token:**
   ```bash
   POST /api/auth/request-password-reset
   Body: { "email": "user@example.com" }
   ```

2. **Get token from response** (development) or check database:
   ```sql
   SELECT reset_token, reset_token_expires 
   FROM profiles 
   WHERE email = 'user@example.com';
   ```

3. **Use the token to reset:**
   ```bash
   POST /api/auth/reset-password
   Body: {
     "token": "<token_from_step_2>",
     "password": "newPassword123"
   }
   ```

---

## Changing User Emails

### Via API (Recommended)

Update user email through the user management endpoint:

```bash
PATCH /api/auth/users/:userId
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "email": "newemail@example.com"
}
```

**Note**: The email must be unique. If the email already exists, the update will fail.

### Via Database (Direct)

```sql
UPDATE profiles 
SET email = 'newemail@example.com',
    updated_at = NOW()
WHERE id = '<user_id>';
```

⚠️ **Important**: Ensure the new email is unique and valid.

---

## Creating New Users

### Method 1: Via User Invitation (Recommended)

Use the invite endpoint (requires Super Admin):

```bash
POST /api/auth/users/invite
Headers: { "Authorization": "Bearer <super_admin_token>" }
Body: {
  "email": "newuser@example.com",
  "full_name": "John Doe",
  "role": "user",  // or "admin"
  "status": "pending"  // or "approved"
}
```

**After Invitation:**
1. User receives invitation (if email sending is configured)
2. User must set their password via password reset flow
3. Admin approves user (if status is "pending")

### Method 2: Direct Database Insert (Advanced)

```sql
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  status,
  password_hash,  -- Must be bcrypt hash
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'user@example.com',
  'User Name',
  'user',
  'pending',
  '<bcrypt_hash>',  -- Generate using bcrypt
  NOW(),
  NOW()
);
```

Then set password via reset flow.

---

## Managing User Status

### Approving Users

Users with `status = 'pending'` cannot log in. To approve:

```bash
PATCH /api/auth/users/:userId
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "status": "approved"
}
```

### Rejecting Users

```bash
PATCH /api/auth/users/:userId
Body: {
  "status": "rejected"
}
```

### Changing User Roles

```bash
PATCH /api/auth/users/:userId
Body: {
  "role": "admin"  // or "user"
}
```

---

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/request-password-reset` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/update-password` | Yes | Update own password |
| GET | `/api/auth/me` | Yes | Get current user |

### User Management Endpoints (Admin)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/auth/users` | Admin | List all users |
| PATCH | `/api/auth/users/:id` | Admin | Update user |
| POST | `/api/auth/users/:id/reset-password` | Admin | Reset user password (direct) |
| POST | `/api/auth/users/invite` | Super Admin | Invite new user |
| DELETE | `/api/auth/users/:id` | Super Admin | Delete user |

---

## Common Tasks

### Task 1: Set Password for New User

```bash
# 1. Invite user
POST /api/auth/users/invite
{ "email": "user@example.com", "status": "approved" }

# 2. Request password reset
POST /api/auth/request-password-reset
{ "email": "user@example.com" }

# 3. Get token from response (dev) or database
# 4. Reset password
POST /api/auth/reset-password
{ "token": "<token>", "password": "SecurePass123" }
```

### Task 2: Reset Password for Existing User (Admin)

**Option A: Direct Admin Reset (Easiest)**
```bash
POST /api/auth/users/:userId/reset-password
Headers: { "Authorization": "Bearer <admin_token>" }
Body: { "password": "NewPassword123" }
```

**Option B: Via Token Flow**
```bash
# 1. Request reset
POST /api/auth/request-password-reset
{ "email": "user@example.com" }

# 2. Use token to reset
POST /api/auth/reset-password
{ "token": "<token>", "password": "NewPassword123" }
```

### Task 3: Change User Email

```bash
PATCH /api/auth/users/:userId
{ "email": "newemail@example.com" }
```

### Task 4: Approve Pending User

```bash
PATCH /api/auth/users/:userId
{ "status": "approved" }
```

---

## Security Best Practices

1. **Never share passwords**: Always use password reset flow
2. **Use strong passwords**: Minimum 6 characters (enforced), recommend 12+ with mix of characters
3. **Rotate JWT_SECRET**: Change periodically in production
4. **Monitor reset tokens**: Tokens expire after 1 hour
5. **Audit user changes**: Log all admin actions
6. **Email verification**: Consider implementing email verification for new emails

---

## Troubleshooting

### User Can't Log In

1. Check user status: `SELECT status FROM profiles WHERE email = '...'`
2. Verify password is set: `SELECT password_hash IS NOT NULL FROM profiles WHERE email = '...'`
3. Check if user is approved: Status must be "approved"

### Password Reset Not Working

1. Check token expiration: `SELECT reset_token_expires FROM profiles WHERE email = '...'`
2. Verify token matches: Compare token in URL with database
3. Check token hasn't been used: Token is cleared after successful reset

### Email Already Exists

- Emails must be unique
- Check existing user: `SELECT * FROM profiles WHERE email = '...'`
- Update existing user instead of creating new one

---

## Database Schema Reference

### Profiles Table Columns

- `id` (UUID) - Primary key
- `email` (TEXT) - Unique user email
- `password_hash` (TEXT) - Bcrypt hashed password
- `reset_token` (TEXT) - Password reset token
- `reset_token_expires` (TIMESTAMPTZ) - Token expiration
- `full_name` (TEXT) - User's full name
- `role` (TEXT) - "user" or "admin"
- `status` (TEXT) - "pending", "approved", or "rejected"
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Need Help?

If you encounter issues:
1. Check server logs for error messages
2. Verify database connection
3. Ensure JWT_SECRET is set in environment variables
4. Check that all required columns exist in profiles table

