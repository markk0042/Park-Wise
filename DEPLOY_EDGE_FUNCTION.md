# Quick Guide: Deploy Supabase Edge Function for Email Reports

The error "Requested function was not found" means the Edge Function needs to be deployed to Supabase.

## Quick Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

### 3. Link Your Project

```bash
supabase link --project-ref fztysfsuvepkfhtanxhr
```

### 4. Get Resend API Key (if you don't have one)

1. Go to https://resend.com
2. Sign up (free tier: 3,000 emails/month)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `re_`)

### 5. Set Edge Function Secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
supabase secrets set RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Note:** For testing, use `onboarding@resend.dev`. For production, add your own domain in Resend.

### 6. Deploy the Function

```bash
supabase functions deploy send-report-email
```

### 7. Verify Deployment

1. Go to https://supabase.com/dashboard/project/fztysfsuvepkfhtanxhr
2. Navigate to **Edge Functions** in the left sidebar
3. You should see `send-report-email` listed

### 8. Test It

Try sending a PDF report from your web app again!

---

## Alternative: Deploy via Supabase Dashboard

If you prefer using the web interface:

1. Go to https://supabase.com/dashboard/project/fztysfsuvepkfhtanxhr/functions
2. Click **Create a new function**
3. Name it: `send-report-email`
4. Copy the contents of `supabase/functions/send-report-email/index.ts`
5. Paste into the editor
6. Click **Deploy**
7. Go to **Settings** → **Edge Functions** → **Secrets**
8. Add:
   - `RESEND_API_KEY` = your Resend API key
   - `RESEND_FROM_EMAIL` = `onboarding@resend.dev` (or your domain)

---

## Troubleshooting

### "Function not found" error persists
- Make sure you deployed to the correct project (`fztysfsuvepkfhtanxhr`)
- Check that the function name is exactly `send-report-email` (case-sensitive)
- Verify in Supabase Dashboard → Edge Functions

### "RESEND_API_KEY not configured"
- Make sure you set the secret: `supabase secrets set RESEND_API_KEY=...`
- Check in Supabase Dashboard → Settings → Edge Functions → Secrets

### Email not sending
- Check Edge Function logs in Supabase Dashboard
- Verify Resend API key is valid
- Check Resend dashboard for delivery status



