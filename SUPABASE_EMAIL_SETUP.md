# Supabase Email Setup Guide - Report Emails

This guide explains how to configure email sending for parking reports using Supabase Edge Functions with Resend.

## Overview

Instead of configuring a separate email account (Gmail/SMTP), we use **Supabase Edge Functions** with **Resend** (a modern email API) to send emails. This keeps everything within your Supabase ecosystem.

## Prerequisites

- A Supabase project (you already have this)
- A Resend account (free tier available: 3,000 emails/month)

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (no credit card required)
3. Verify your email address

## Step 2: Get Resend API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `Park Wise Reports`
4. Copy the API key (starts with `re_`)

## Step 3: Add Domain (Optional but Recommended)

For production, you should add your own domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Follow the DNS setup instructions
4. Once verified, you can use emails like `noreply@yourdomain.com`

**For testing**, you can use Resend's default domain: `onboarding@resend.dev` (limited to 100 emails/day)

## Step 4: Deploy Supabase Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref fztysfsuvepkfhtanxhr
   ```

4. **Set Edge Function secrets**:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```
   
   Or if using Resend's test domain:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   supabase secrets set RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

5. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-report-email
   ```

## Step 5: Verify Setup

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **send-report-email**
3. Check that it's deployed and active
4. Test sending a report from your web app

## Environment Variables

The Edge Function uses these secrets (set via `supabase secrets set`):

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_abc123...` |
| `RESEND_FROM_EMAIL` | Email address to send from | `noreply@yourdomain.com` or `onboarding@resend.dev` |

## How It Works

1. User clicks "Send" in the Generate Reports page
2. Backend calls Supabase Edge Function: `/functions/v1/send-report-email`
3. Edge Function uses Resend API to send the email
4. Email is delivered with CSV attachment

## Troubleshooting

### Edge Function not found
- Make sure you've deployed the function: `supabase functions deploy send-report-email`
- Check that the function exists in Supabase Dashboard → Edge Functions

### Email not sending
- Check Edge Function logs in Supabase Dashboard
- Verify `RESEND_API_KEY` is set correctly
- Verify `RESEND_FROM_EMAIL` is a valid domain/email
- Check Resend dashboard for delivery status

### Rate Limits
- Resend free tier: 3,000 emails/month, 100/day
- If you exceed limits, upgrade to a paid plan or use your own SMTP

## Benefits of This Approach

✅ **No separate email account needed** - Uses Resend API  
✅ **Integrated with Supabase** - Everything in one place  
✅ **Free tier available** - 3,000 emails/month  
✅ **Reliable delivery** - Resend has excellent deliverability  
✅ **Easy to scale** - Upgrade Resend plan as needed  

## Alternative: Use Your Own SMTP

If you prefer to use your own email provider, you can still use the old method by configuring SMTP/Gmail in `server/.env` (the code supports both methods).

