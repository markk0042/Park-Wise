# How Authentication Works - Complete Guide

This document explains how the username/password authentication system works in Park-Wise, from user login to admin password management.

## 🏗️ Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│   Backend    │────────▶│  Database   │
│ (Web/Mobile)│         │     API      │         │ (Supabase)  │
└─────────────┘         └──────────────┘         └─────────────┘
     │                        │                        │
     │                        │                        │
  JWT Token              Password Hash            User Data
  (localStorage)         (bcrypt)                 (profiles table)
```

**Key Points:**
- ✅ Passwords are **NEVER** stored on the device
- ✅ Passwords are hashed with bcrypt in the database
- ✅ Only JWT tokens are stored locally for session management
- ✅ Works identically for web and mobile apps

---

## 🔐 User Login Flow

### Step-by-Step Process

```
1. User enters email + password
   │
   ▼
2. Frontend sends POST /api/auth/login
   Body: { email: "user@example.com", password: "password123" }
   │
   ▼
3. Backend receives request
   │
   ▼
4. Backend looks up user in database by email
   │
   ▼
5. Backend compares password with bcrypt hash
   ├─ If match: Continue
   └─ If no match: Return error
   │
   ▼
6. Backend checks user status
   ├─ If "approved": Continue
   └─ If "pending" or "rejected": Return error
   │
   ▼
7. Backend generates JWT token (valid for 24 hours)
   │
   ▼
8. Backend returns user data + token
   Response: { user: {...}, token: "eyJhbGc..." }
   │
   ▼
9. Frontend stores token in localStorage
   │
   ▼
10. Frontend uses token for all future API requests
    Headers: { Authorization: "Bearer eyJhbGc..." }
    
11. If token expires (after 24 hours):
    - Server returns 401 Unauthorized
    - Frontend detects expiration
    - Shows message: "Your session has expired. Please log in again."
    - Redirects to login page
```

### Code Flow

**Frontend (Login.jsx):**
```javascript
// User clicks login button
await signInWithPassword(email, password);
```

**Frontend (AuthContext.jsx):**
```javascript
signInWithPassword: async (email, password) => {
  // Calls API
  const { user, token } = await apiLogin(email, password);
  
  // Stores token locally
  setAuthToken(token);
  setToken(token);
  localStorage.setItem('auth_token', token);
}
```

**Backend (auth.controller.js):**
```javascript
export const login = async (req, res) => {
  // 1. Validate input
  const { email, password } = req.body;
  
  // 2. Authenticate (checks password hash)
  const user = await authenticateUser(email, password);
  
  // 3. Generate JWT token
  const token = generateToken(user);
  
  // 4. Return user + token
  res.json({ user, token });
}
```

**Backend (auth.service.js):**
```javascript
export const authenticateUser = async (email, password) => {
  // 1. Find user in database
  const user = await findUserByEmail(email);
  
  // 2. Compare password with bcrypt hash
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  // 3. Check user status
  if (user.status !== 'approved') {
    throw new Error('Account not approved');
  }
  
  return user; // Without password hash
}
```

---

## 🔑 Password Storage

### How Passwords Are Stored

```
User enters: "MyPassword123"
         │
         ▼
Backend hashes with bcrypt (10 rounds)
         │
         ▼
Stored in database: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

**Database Schema (profiles table):**
```sql
id                  UUID (primary key)
email               TEXT (unique)
password_hash       TEXT (bcrypt hash)
full_name           TEXT
role                TEXT ('user' or 'admin')
status              TEXT ('pending', 'approved', 'rejected')
reset_token         TEXT (nullable)
reset_token_expires TIMESTAMPTZ (nullable)
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Security Features:**
- ✅ Passwords are hashed with bcrypt (10 salt rounds)
- ✅ Original password cannot be recovered from hash
- ✅ Each password gets a unique salt
- ✅ Password hash is never returned in API responses

---

## 🔄 Password Reset Flow (User-Initiated)

### When User Forgets Password

```
1. User clicks "Forgot Password"
   │
   ▼
2. User enters email
   │
   ▼
3. Frontend sends POST /api/auth/request-password-reset
   Body: { email: "user@example.com" }
   │
   ▼
4. Backend generates random reset token
   Token: "a1b2c3d4e5f6..." (32 bytes hex)
   │
   ▼
5. Backend stores token in database
   reset_token: "a1b2c3d4e5f6..."
   reset_token_expires: "2024-01-15 14:00:00" (1 hour from now)
   │
   ▼
6. Backend returns token (in dev) or sends email (in production)
   │
   ▼
7. User receives token (via email or dev response)
   │
   ▼
8. User enters new password + token
   │
   ▼
9. Frontend sends POST /api/auth/reset-password
   Body: { token: "a1b2c3d4e5f6...", password: "NewPassword123" }
   │
   ▼
10. Backend validates token
    ├─ Checks if token exists
    ├─ Checks if token hasn't expired
    └─ If valid: Continue
    │
    ▼
11. Backend hashes new password
    │
    ▼
12. Backend updates password_hash in database
    │
    ▼
13. Backend clears reset_token and reset_token_expires
    │
    ▼
14. User can now login with new password
```

---

## 👨‍💼 Admin Password Reset Flow

### Direct Admin Reset (New Feature)

```
1. Admin wants to reset user's password
   │
   ▼
2. Admin sends POST /api/auth/users/:userId/reset-password
   Headers: { Authorization: "Bearer <admin_token>" }
   Body: { password: "NewPassword123" }
   │
   ▼
3. Backend verifies admin is authenticated
   │
   ▼
4. Backend verifies admin has "admin" role
   │
   ▼
5. Backend prevents admin from resetting own password
   (Must use /api/auth/update-password instead)
   │
   ▼
6. Backend hashes new password
   │
   ▼
7. Backend updates password_hash in database
   │
   ▼
8. Backend clears any existing reset tokens
   │
   ▼
9. Backend returns success
   Response: { message: "Password reset successfully", user: {...} }
```

### Code Example

**Admin makes request:**
```bash
POST /api/auth/users/123e4567-e89b-12d3-a456-426614174000/reset-password
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Body: {
  "password": "SecurePassword123"
}
```

**Backend processes:**
```javascript
export const adminResetUserPassword = async (req, res) => {
  // 1. Verify admin is authenticated (middleware)
  // 2. Get user ID from URL
  const userId = req.params.id;
  
  // 3. Prevent self-reset
  if (userId === req.user.id) {
    return error("Cannot reset your own password");
  }
  
  // 4. Hash new password
  const password_hash = await hashPassword(password);
  
  // 5. Update database
  await supabaseAdmin
    .from('profiles')
    .update({ password_hash })
    .eq('id', userId);
  
  // 6. Return success
  res.json({ message: "Password reset successfully" });
}
```

---

## 📱 Mobile App Integration

### How It Works on Mobile

The mobile app uses **exactly the same API endpoints** as the web app:

```javascript
// Mobile app login (React Native example)
const login = async (email, password) => {
  const response = await fetch('https://your-api.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const { user, token } = await response.json();
  
  // Store token securely (use SecureStore or Keychain)
  await SecureStore.setItemAsync('auth_token', token);
  
  return { user, token };
};
```

**Key Differences:**
- Web: Stores token in `localStorage`
- Mobile: Stores token in secure storage (Keychain on iOS, Keystore on Android)

**Everything else is identical:**
- Same API endpoints
- Same authentication flow
- Same password hashing
- Same JWT tokens
- Same admin features

---

## 🔒 Security Features

### Password Security

1. **Bcrypt Hashing**
   - 10 salt rounds (configurable)
   - Unique salt per password
   - One-way hashing (cannot reverse)

2. **Password Requirements**
   - Minimum 6 characters (enforced)
   - Recommend 12+ characters with mix of types

3. **Token Security**
   - JWT tokens expire after 7 days
   - Reset tokens expire after 1 hour
   - Tokens are cleared after use

### Authentication Security

1. **JWT Tokens**
   - Signed with secret key
   - Contains user ID, email, role, status
   - **Expires after 24 hours** (improved security)
   - Validated on every protected request
   - Shows friendly message when expired: "Your session has expired. Please log in again."

2. **Middleware Protection**
   ```javascript
   // Protected route
   router.get('/users', requireAuth, requireAdmin, listUsers);
   ```
   - `requireAuth`: Verifies JWT token
   - `requireAdmin`: Checks if user has admin role

3. **Password Reset Security**
   - Tokens are single-use
   - Tokens expire after 1 hour
   - Tokens are cryptographically random

4. **Session Expiration**
   - JWT tokens expire after 24 hours
   - Users see friendly message: "Your session has expired. Please log in again."
   - Automatic logout on token expiration

---

## 📊 Database Structure

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                    -- bcrypt hash
  full_name TEXT,
  role TEXT DEFAULT 'user',              -- 'user' or 'admin'
  status TEXT DEFAULT 'pending',         -- 'pending', 'approved', 'rejected'
  reset_token TEXT,                      -- nullable, for password resets
  reset_token_expires TIMESTAMPTZ,       -- nullable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### What Gets Stored Where

| Data | Location | Format | Notes |
|------|----------|--------|-------|
| Password | Database | bcrypt hash | Never stored in plain text |
| JWT Token | Client (localStorage/Keychain) | JWT string | Expires in 7 days |
| Reset Token | Database | Random hex string | Expires in 1 hour |
| User Data | Database | JSON | Email, name, role, status |

---

## 🚀 API Endpoints Summary

### Public Endpoints (No Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/request-password-reset` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/check-email` | Check if email exists |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/auth/me` | User | Get current user |
| PATCH | `/api/auth/me` | User | Update own profile |
| POST | `/api/auth/update-password` | User | Change own password |

### Admin Endpoints (Admin Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/auth/users` | List all users |
| PATCH | `/api/auth/users/:id` | Update user |
| POST | `/api/auth/users/:id/reset-password` | **Reset user password** |
| POST | `/api/auth/users/invite` | Invite new user |
| DELETE | `/api/auth/users/:id` | Delete user |

---

## 💡 Common Scenarios

### Scenario 1: New User Registration

```
1. Admin invites user: POST /api/auth/users/invite
2. User receives invitation (email)
3. User requests password reset: POST /api/auth/request-password-reset
4. User gets reset token
5. User sets password: POST /api/auth/reset-password
6. Admin approves user: PATCH /api/auth/users/:id { status: "approved" }
7. User can now login
```

### Scenario 2: User Forgets Password

```
1. User requests reset: POST /api/auth/request-password-reset
2. User receives token (email or dev response)
3. User resets password: POST /api/auth/reset-password
4. User can login with new password
```

### Scenario 3: Admin Resets User Password

```
1. Admin resets password: POST /api/auth/users/:userId/reset-password
   Body: { password: "NewPassword123" }
2. User can immediately login with new password
3. No token needed - direct reset
```

### Scenario 4: User Changes Own Password

```
1. User is logged in (has JWT token)
2. User changes password: POST /api/auth/update-password
   Body: { currentPassword: "Old123", newPassword: "New456" }
3. Backend verifies current password
4. Backend updates password hash
5. User continues with same session
```

---

## 🔍 Troubleshooting

### User Can't Login

**Check:**
1. User exists in database: `SELECT * FROM profiles WHERE email = '...'`
2. Password is set: `SELECT password_hash IS NOT NULL FROM profiles WHERE email = '...'`
3. User is approved: `SELECT status FROM profiles WHERE email = '...'` (must be "approved")
4. Password is correct (test with bcrypt.compare)

### Admin Can't Reset Password

**Check:**
1. Admin is authenticated: Token is valid
2. Admin has admin role: `SELECT role FROM profiles WHERE id = '<admin_id>'` (must be "admin")
3. User ID is correct: User exists in database
4. Not trying to reset own password (use update-password endpoint instead)

### Token Issues

**JWT Token:**
- Expires after 7 days
- Must be included in Authorization header: `Bearer <token>`
- Invalid tokens return 401 Unauthorized

**Reset Token:**
- Expires after 1 hour
- Single-use only (cleared after successful reset)
- Must match exactly (case-sensitive)

---

## 📝 Summary

**How It Works:**
1. ✅ Passwords are hashed with bcrypt and stored in database
2. ✅ Users login with email/password, receive JWT token
3. ✅ JWT token is stored locally (web: localStorage, mobile: secure storage)
4. ✅ Token is sent with every API request for authentication
5. ✅ Admins can reset any user's password directly via API
6. ✅ Works identically for web and mobile apps

**Key Security Points:**
- Passwords never stored in plain text
- Passwords never stored on device
- All authentication happens server-side
- Tokens expire automatically
- Admin actions require authentication

This system is secure, scalable, and works seamlessly across web and mobile platforms! 🎉

