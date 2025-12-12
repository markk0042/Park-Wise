# How 2FA Works - Complete Guide

## 🎯 Which Users Need 2FA?

### ✅ **NON-ADMIN Users (Required)**
- Users with `role: 'user'` in the database
- **2FA is optional but recommended** for these users
- If 2FA is enabled, they **must** enter a code every time they log in
- If 2FA is NOT enabled, they can log in normally (password only)

### ❌ **ADMIN Users (Exempt)**
- Users with `role: 'admin'` in the database
- **2FA is completely bypassed** for admin users
- Admins can log in with just email + password
- Admins cannot even set up 2FA (the system blocks them)

---

## 📋 Complete User Journey

### **Scenario 1: Non-Admin User WITHOUT 2FA Enabled**

1. User enters email + password on login page
2. System checks: `user.role !== 'admin'` ✅ (non-admin)
3. System checks: `two_factor_enabled === false` ✅ (not enabled)
4. **Login completes immediately** - no 2FA code required
5. User is redirected to `/Dashboard`

**Result:** Normal login, no 2FA prompt

---

### **Scenario 2: Non-Admin User WITH 2FA Enabled**

1. User enters email + password on login page
2. System checks: `user.role !== 'admin'` ✅ (non-admin)
3. System checks: `two_factor_enabled === true` ✅ (enabled)
4. **2FA verification screen appears**
5. User enters 6-digit code from authenticator app (or backup code)
6. System verifies the code
7. **Login completes** after successful verification
8. User is redirected to `/Dashboard`

**Result:** Two-step login (password + 2FA code)

---

### **Scenario 3: Admin User (Any Status)**

1. User enters email + password on login page
2. System checks: `user.role === 'admin'` ✅ (admin)
3. **2FA check is SKIPPED entirely**
4. **Login completes immediately** - no 2FA code required
5. User is redirected to `/UserManagement`

**Result:** Normal login, 2FA completely bypassed

---

## 🔧 Setting Up 2FA (Non-Admin Users Only)

### Step-by-Step Setup Process:

1. **User navigates to `/2fa/setup`**
   - Must be logged in first
   - If admin tries to access, they're redirected to Dashboard

2. **User clicks "Set Up 2FA"**
   - Backend generates a TOTP secret
   - QR code is displayed on screen

3. **User scans QR code**
   - Uses authenticator app (Google Authenticator, Authy, etc.)
   - Secret is stored in their app

4. **User enters verification code**
   - Enters 6-digit code from authenticator app
   - System verifies the code matches

5. **Backup codes are displayed**
   - 10 one-time use codes
   - User must save these (copy/download)
   - Codes are hashed and stored in database

6. **2FA is enabled**
   - `two_factor_enabled` set to `true` in database
   - User will now be prompted for 2FA on every login

---

## 🔐 Login Flow (Detailed)

### Code Flow for Non-Admin Users:

```
1. User submits login form
   ↓
2. Frontend calls: signInWithPassword(email, password)
   ↓
3. Supabase Auth verifies email/password
   ↓
4. If successful, get user profile from backend
   ↓
5. Check: if (user.role !== 'admin')
   ↓
6. If non-admin:
   ├─ Check: check2FAStatus()
   ├─ If 2FA enabled:
   │  ├─ Set requires2FA = true
   │  ├─ Store pending2FAUserId
   │  └─ Show TwoFactorVerification component
   └─ If 2FA NOT enabled:
      └─ Complete login (set profile, redirect)
   ↓
7. If admin:
   └─ Complete login immediately (skip 2FA check)
```

### Code Flow for 2FA Verification:

```
1. User enters 6-digit code
   ↓
2. Frontend calls: verify2FA(code)
   ↓
3. Backend verifies code:
   ├─ Check if it's a TOTP code (6 digits)
   ├─ OR check if it's a backup code (8 hex chars)
   └─ Verify against stored secret/backup codes
   ↓
4. If valid:
   ├─ If backup code used, remove it from database
   ├─ Complete login (set profile, redirect)
   └─ Clear 2FA pending state
   ↓
5. If invalid:
   └─ Show error, allow retry
```

---

## 🚫 What Admins Cannot Do

- ❌ Cannot access `/2fa/setup` page (redirected to Dashboard)
- ❌ Cannot call `POST /api/auth/2fa/generate` (returns 403 error)
- ❌ Cannot call `POST /api/auth/2fa/verify-setup` (returns 403 error)
- ❌ Cannot call `POST /api/auth/2fa/disable` (returns 403 error)
- ✅ Can check 2FA status (but it will always show `enabled: false, required: false`)

---

## 📊 Database Fields

### `profiles` Table:

```sql
two_factor_secret      TEXT        -- Base32 encoded TOTP secret
two_factor_enabled      BOOLEAN     -- Whether 2FA is active
two_factor_backup_codes TEXT[]      -- Array of hashed backup codes
```

### Example Data:

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "user",  // ← This determines if 2FA applies
  "two_factor_secret": "JBSWY3DPEHPK3PXP",
  "two_factor_enabled": true,  // ← This determines if 2FA is required on login
  "two_factor_backup_codes": [
    "a1b2c3d4e5f6g7h8...",  // Hashed backup codes
    "b2c3d4e5f6g7h8i9..."
  ]
}
```

---

## 🔍 Key Code Locations

### Backend Checks:

**File:** `server/src/controllers/auth.controller.js`
- Line 412: `if (req.user.role === 'admin')` - Blocks admin from generating 2FA
- Line 439: `if (req.user.role === 'admin')` - Blocks admin from verifying setup
- Line 518: `if (req.user.role === 'admin')` - Blocks admin from disabling 2FA

**File:** `src/context/AuthContext.jsx`
- Line 323: `if (user.role !== 'admin')` - Only check 2FA for non-admins
- Line 326: `if (twoFactorStatus.enabled)` - Check if 2FA is enabled

### Frontend Checks:

**File:** `src/pages/TwoFactorSetup.jsx`
- Line 20: Redirects admins away from setup page

**File:** `src/pages/index.jsx`
- Line 120: Allows `/2fa/setup` route for authenticated users

---

## 🎬 Real-World Examples

### Example 1: Regular User (No 2FA)
```
User: john@example.com
Role: user
2FA Enabled: false

Login Flow:
1. Enter email + password → ✅ Login successful
2. Redirected to Dashboard
```

### Example 2: Regular User (With 2FA)
```
User: jane@example.com
Role: user
2FA Enabled: true

Login Flow:
1. Enter email + password → ✅ Password verified
2. 2FA screen appears
3. Enter 6-digit code → ✅ Code verified
4. Redirected to Dashboard
```

### Example 3: Admin User
```
User: admin@example.com
Role: admin
2FA Enabled: (doesn't matter)

Login Flow:
1. Enter email + password → ✅ Login successful
2. 2FA check is SKIPPED
3. Redirected to UserManagement
```

---

## ⚙️ Configuration

### Making 2FA Mandatory (Future Enhancement)

Currently, 2FA is **optional** for non-admin users. To make it mandatory:

1. Add a check after login: if non-admin and 2FA not enabled, redirect to `/2fa/setup`
2. Block access to other pages until 2FA is set up
3. Add a flag in user profile: `two_factor_required: true`

### Current Behavior:
- Non-admin users can log in without 2FA
- 2FA is recommended but not enforced
- Users can enable/disable 2FA at will (if they're non-admin)

---

## 📝 Summary

| User Type | 2FA Required? | Can Set Up? | Login Flow |
|-----------|---------------|-------------|------------|
| **Admin** | ❌ No | ❌ No | Email + Password only |
| **Non-Admin (2FA OFF)** | ❌ No | ✅ Yes | Email + Password only |
| **Non-Admin (2FA ON)** | ✅ Yes | ✅ Yes | Email + Password + 2FA Code |

**Key Point:** 2FA is **only checked and required** for non-admin users who have it enabled. Admins completely bypass 2FA.

