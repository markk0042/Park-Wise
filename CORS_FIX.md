# CORS Error Fix - Production Deployment

## Issue
Getting CORS error: `Origin https://park-wise-two.vercel.app is not allowed by Access-Control-Allow-Origin. Status code: 502`

## What I Fixed

✅ **Updated CORS configuration** in `server/src/app.js`:
- Now automatically allows `https://park-wise-two.vercel.app`
- Handles both development and production environments
- Better error logging for debugging

## The 502 Error

A **502 Bad Gateway** error means:
- The backend server might be down
- The backend might have crashed
- There's a configuration issue

## Steps to Fix

### 1. Check Backend Status

Go to your Render dashboard and check:
- Is the backend service running?
- Are there any error logs?
- Did the service crash?

### 2. Update Environment Variables in Render

Make sure these are set in your Render backend service:

```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://fztysfsuvepkfhtanxhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=complaint-evidence
CORS_ORIGIN=https://park-wise-two.vercel.app,http://localhost:5173
JWT_SECRET=your-jwt-secret-minimum-32-characters
FRONTEND_URL=https://park-wise-two.vercel.app
```

**Important:** The `CORS_ORIGIN` should include your frontend URL.

### 3. Restart Backend Service

After updating environment variables:
1. Go to Render dashboard
2. Click on your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Or restart the service

### 4. Verify Backend is Running

Test the health endpoint:
```bash
curl https://parkinglog-backend.onrender.com/api/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}
```

### 5. Test CORS

After restart, test from your frontend:
- The CORS error should be gone
- Password reset should work

## Updated CORS Configuration

The new CORS config:
- ✅ Automatically allows `https://park-wise-two.vercel.app`
- ✅ Allows localhost in development
- ✅ Respects `CORS_ORIGIN` environment variable
- ✅ Better error logging

## If Still Having Issues

### Check Render Logs

1. Go to Render dashboard
2. Click on your backend service
3. Click "Logs" tab
4. Look for:
   - CORS warnings
   - Startup errors
   - Environment variable errors

### Common Issues

**Issue:** Backend won't start
- Check if all required environment variables are set
- Check if `JWT_SECRET` is at least 32 characters
- Check if Supabase credentials are correct

**Issue:** Still getting CORS errors
- Make sure you restarted the backend after code changes
- Check that `CORS_ORIGIN` includes your frontend URL
- Verify the backend URL is correct in frontend `.env`

**Issue:** 502 Bad Gateway
- Backend might be sleeping (free tier)
- Wait a few seconds and try again
- Check Render dashboard for service status

## Testing Locally

To test CORS locally:

1. **Backend** (terminal 1):
   ```bash
   cd server
   npm run dev
   ```

2. **Frontend** (terminal 2):
   ```bash
   npm run dev
   ```

3. **Test password reset:**
   - Should work without CORS errors
   - Check server console for reset token

## Production Checklist

- [ ] Backend is running on Render
- [ ] All environment variables are set in Render
- [ ] `CORS_ORIGIN` includes frontend URL
- [ ] Backend was restarted after code changes
- [ ] Health endpoint returns 200 OK
- [ ] Frontend can make API requests

## Next Steps

1. **Deploy the updated code** to Render
2. **Update environment variables** if needed
3. **Restart the backend service**
4. **Test password reset** from production frontend
5. **Check logs** if issues persist

The CORS configuration is now fixed and should work automatically! 🎉

