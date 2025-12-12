# Mandatory 2FA Update

## Changes Made

2FA is now **MANDATORY** for non-admin users and **OPTIONAL** for admin users.

### For Non-Admin Users:
- ✅ **2FA is REQUIRED** - They must set it up to access the app
- ✅ **Cannot disable 2FA** - Once enabled, it cannot be turned off
- ✅ **Blocked from app** - If 2FA is not enabled, they're redirected to `/2fa/setup`
- ✅ **Must verify on login** - Every login requires a 2FA code

### For Admin Users:
- ✅ **2FA is OPTIONAL** - They can choose to enable it or not
- ✅ **Can disable 2FA** - Admins can turn 2FA on/off as needed
- ✅ **No 2FA check on login** - Admins bypass 2FA verification entirely
- ✅ **Full access** - Admins can access all pages regardless of 2FA status

## Implementation Details

### Backend Changes:
1. **`check2FAStatus` endpoint** - Now returns `required: true` for non-admin users
2. **`disable2FA` endpoint** - Now blocks non-admin users from disabling (returns 403)

### Frontend Changes:
1. **Routing logic** - Non-admin users without 2FA are redirected to `/2fa/setup`
2. **TwoFactorSetup page** - Shows "Required" message instead of "Note"
3. **Disable button** - Hidden for non-admin users (only admins can disable)

### User Flow:

#### Non-Admin User (First Login):
```
1. Login with email + password
2. System checks: role !== 'admin' ✅
3. System checks: 2FA enabled? ❌ NO
4. Redirected to /2fa/setup
5. Must set up 2FA to continue
6. After setup, can access app
```

#### Non-Admin User (Subsequent Logins):
```
1. Login with email + password
2. System checks: role !== 'admin' ✅
3. System checks: 2FA enabled? ✅ YES
4. 2FA verification screen appears
5. Enter 6-digit code
6. Access granted
```

#### Admin User (Any Login):
```
1. Login with email + password
2. System checks: role === 'admin' ✅
3. 2FA check SKIPPED
4. Access granted immediately
```

## Testing Checklist

- [ ] Non-admin user without 2FA is redirected to setup page
- [ ] Non-admin user cannot disable 2FA (button hidden/blocked)
- [ ] Admin user can access app without 2FA
- [ ] Admin user can enable/disable 2FA freely
- [ ] Non-admin user with 2FA must verify on every login
- [ ] Admin user bypasses 2FA verification on login

