# Troubleshooting Login 400 Errors

## Common Causes of 400 Errors

A 400 Bad Request error from Supabase Auth typically means one of the following:

### 1. **Invalid Credentials**
- Wrong email address
- Wrong password
- Email/password mismatch

**Solution:** Double-check your credentials. Use the "Forgot password?" link if needed.

### 2. **Email Not Confirmed**
- User account exists but email hasn't been verified
- Supabase requires email confirmation (if enabled in settings)

**Solution:** Check your email inbox for a confirmation link, or contact an admin to verify your account.

### 3. **Account Disabled/Banned**
- Account has been disabled by an admin
- Account has been banned due to policy violations

**Solution:** Contact a super admin to restore your account.

### 4. **Rate Limiting**
- Too many failed login attempts
- Supabase rate limiting kicked in

**Solution:** Wait 5-15 minutes and try again.

### 5. **Supabase Configuration Issues**
- Missing or incorrect Supabase URL
- Missing or incorrect Supabase anon key
- CORS issues

**Solution:** Check environment variables:
- `VITE_SUPABASE_URL` should be your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` should be your Supabase anon/public key

## Debugging Steps

1. **Check Browser Console**
   - Look for detailed error messages
   - Check the Network tab for the exact request/response

2. **Verify Environment Variables**
   ```bash
   # Check if variables are set
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

3. **Check Supabase Dashboard**
   - Go to Authentication → Users
   - Verify the user exists
   - Check if email is confirmed
   - Check if account is disabled

4. **Test with Different Credentials**
   - Try logging in with a known working account
   - Try creating a new test account

5. **Check Supabase Auth Settings**
   - Go to Authentication → Settings
   - Verify "Enable email confirmations" setting
   - Check if any restrictions are enabled

## Error Messages You Might See

- **"Invalid login credentials"** → Wrong email/password
- **"Email not confirmed"** → Need to verify email
- **"User not found"** → Account doesn't exist
- **"Too many requests"** → Rate limited, wait and retry
- **"Account disabled"** → Contact admin

## Quick Fixes

### If you can't log in:
1. Try "Forgot password?" to reset your password
2. Check your email for confirmation links
3. Contact a super admin for help
4. Clear browser cache and cookies
5. Try a different browser or incognito mode

### For Admins:
1. Check Supabase Dashboard → Authentication → Users
2. Verify user exists and is not disabled
3. Manually confirm email if needed
4. Reset user password if necessary

