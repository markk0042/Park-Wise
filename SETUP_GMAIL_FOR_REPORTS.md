# Setup Gmail to Send Reports to Any Email

The code now supports sending reports to **any email address** using Gmail (no domain needed!).

## Quick Setup (5 minutes)

### Step 1: Create Gmail App Password

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** (left sidebar)
3. Under "How you sign in to Google", click **2-Step Verification** (enable it if not already)
4. Scroll down and click **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)**
7. Enter name: `ParkWise Reports`
8. Click **Generate**
9. **Copy the 16-character password** (you'll need this!)

### Step 2: Add to Backend Environment

#### For Local Development (`server/.env`):
```env
GMAIL_USER=markk0042@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password-here
EMAIL_FROM=markk0042@gmail.com
```

#### For Production (Render):
1. Go to https://dashboard.render.com
2. Select your backend service (`parkinglog-backend`)
3. Go to **Environment** tab
4. Add these variables:
   - `GMAIL_USER` = `markk0042@gmail.com`
   - `GMAIL_APP_PASSWORD` = `your-16-character-app-password`
   - `EMAIL_FROM` = `markk0042@gmail.com`
5. Click **Save Changes**
6. The service will automatically redeploy

### Step 3: Test It!

1. Go to your ParkWise web app
2. Navigate to Reports
3. Select a date range
4. Choose PDF format
5. Enter **any email address** (not just yours!)
6. Click "Send PDF"

## How It Works

The code now:
1. **First tries Gmail/SMTP** (if configured) - ✅ Can send to any email
2. **Falls back to Resend** (Edge Function) - ⚠️ Only to your email

So if Gmail is configured, you can send to **any email address**!

## Benefits

✅ **No domain needed** - Uses your Gmail account  
✅ **Send to any email** - No restrictions  
✅ **Free** - Gmail is free  
✅ **Reliable** - Gmail has excellent deliverability  
✅ **Easy setup** - Just need an app password  

## Limits

- Gmail free tier: 500 emails/day
- Should be plenty for reports!

## Troubleshooting

### "Invalid login" error
- Make sure you're using an **App Password**, not your regular Gmail password
- App passwords are 16 characters, no spaces

### "Less secure app" error
- Make sure 2-Step Verification is enabled
- Use App Password, not regular password

### Still going to spam?
- Gmail emails usually have better deliverability than test domains
- Recipients can mark as "Not Spam" to improve future delivery

---

**That's it!** Once configured, you can send PDF reports to any email address. 🎉



