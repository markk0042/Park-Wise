# Email Setup Guide - Password Reset Emails

This guide explains how to configure email sending for password reset functionality.

## Current Status

✅ **Email service is now implemented!**
- Errors are now logged to console for debugging
- Email sending is configured (works in development and production)

## How It Works

### Development Mode (No Email Config)
- If email is not configured, the system will:
  - Log the reset link to console
  - Show the token in the API response
  - **No actual email is sent**

### Production Mode (With Email Config)
- If email is configured, the system will:
  - Send actual email with reset link
  - Hide token from API response
  - Log success/errors to console

## Setup Options

### Option 1: Gmail (Easiest)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Park Wise"
   - Copy the 16-character password

3. **Add to `server/.env`:**
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   EMAIL_FROM=your-email@gmail.com
   FRONTEND_URL=https://park-wise-two.vercel.app
   ```

### Option 2: SMTP (Any Email Provider)

Works with any SMTP provider (SendGrid, Mailgun, AWS SES, etc.)

**For Gmail SMTP:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
FRONTEND_URL=https://park-wise-two.vercel.app
```

**For SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://park-wise-two.vercel.app
```

**For Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://park-wise-two.vercel.app
```

## Environment Variables

Add these to your `server/.env` file:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FRONTEND_URL` | Optional | Frontend URL for reset links | `https://park-wise-two.vercel.app` |
| `EMAIL_FROM` | Optional | From email address | `noreply@parkwise.com` |
| `GMAIL_USER` | Optional* | Gmail address | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Optional* | Gmail app password | `abcd efgh ijkl mnop` |
| `SMTP_HOST` | Optional* | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | Optional* | SMTP port | `587` or `465` |
| `SMTP_SECURE` | Optional* | Use TLS/SSL | `true` or `false` |
| `SMTP_USER` | Optional* | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | Optional* | SMTP password | `your-password` |

*Required if you want to send actual emails (choose either Gmail or SMTP)

## Testing

### Without Email Config (Development)
1. Request password reset
2. Check console logs - you'll see:
   ```
   📧 [DEV] Password reset email would be sent:
      To: user@example.com
      Reset Link: http://localhost:5173/login?token=abc123...
      Token: abc123...
   ```
3. Use the token from console or API response

### With Email Config (Production)
1. Request password reset
2. Check your email inbox
3. Click the reset link in the email
4. Set new password

## Troubleshooting

### No Email Received

1. **Check Console Logs:**
   ```bash
   # Look for these messages:
   ✅ Password reset email sent successfully
   # OR
   ❌ Failed to send password reset email: [error details]
   ```

2. **Check Email Configuration:**
   - Verify environment variables are set correctly
   - Check for typos in email addresses
   - Ensure SMTP credentials are correct

3. **Check Spam Folder:**
   - Emails might be filtered as spam
   - Add sender to contacts to avoid spam

4. **Gmail Issues:**
   - Make sure you're using an **App Password**, not your regular password
   - Enable "Less secure app access" is NOT needed (use App Password instead)
   - App passwords are 16 characters (no spaces)

5. **SMTP Issues:**
   - Verify SMTP host and port are correct
   - Check if your provider requires TLS/SSL
   - Some providers require whitelisting your IP address

### Error Messages

**"Email service not configured"**
- Add email configuration to `.env` file
- See setup options above

**"Failed to send email: Invalid login"**
- Check username/password are correct
- For Gmail, use App Password, not regular password

**"Connection timeout"**
- Check SMTP host and port
- Verify firewall isn't blocking SMTP port
- Try different port (587 vs 465)

## Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use App Passwords** for Gmail (not your main password)
3. **Rotate passwords** periodically
4. **Use environment-specific configs** (dev vs production)

## Production Deployment

When deploying to production (Render, etc.):

1. Add environment variables in your hosting platform
2. Set `NODE_ENV=production`
3. Configure email settings (Gmail or SMTP)
4. Set `FRONTEND_URL` to your production frontend URL
5. Test password reset flow

## Example .env File

```env
# Existing variables
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_ANON_KEY=your-key
JWT_SECRET=your-secret-key

# Email configuration (Gmail example)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
FRONTEND_URL=https://park-wise-two.vercel.app
```

## Next Steps

1. Choose email provider (Gmail is easiest to start)
2. Set up credentials (App Password for Gmail)
3. Add to `.env` file
4. Restart server
5. Test password reset flow
6. Check email inbox!

