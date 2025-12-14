# Fix Render Build/Start Commands

## The Problem

Your **Build Command** and **Start Command** have placeholder text instead of actual commands:

**Current (WRONG):**
- Build Command: `anpr-service ⚠️ IMPORTANT!/ $`
- Start Command: `anpr-service ⚠️ IMPORTANT!/ $`

**These are not valid commands!** That's why Render says "There's an error above."

## The Fix

Replace them with these actual commands:

### Build Command:
```
pip install -r requirements.txt
```

### Start Command:
```
python anpr.py
```

## Complete Configuration

Here's what all your fields should be:

```
Name: park-wise-anpr (or any name you like)
Source Code: markk0042 / Park-Wise
Branch: main
Region: Oregon (US West) ✅
Root Directory: anpr-service ✅

Build Command: pip install -r requirements.txt ⚠️ FIX THIS
Start Command: python anpr.py ⚠️ FIX THIS

Instance Type: Free ✅

Health Check Path: /health ✅
Pre-Deploy Command: (leave empty) ✅
Auto-Deploy: On Commit ✅
```

## Step-by-Step Fix

1. **Find "Build Command" field**
2. **Delete the text:** `anpr-service ⚠️ IMPORTANT!/ $`
3. **Type:** `pip install -r requirements.txt`
4. **Find "Start Command" field**
5. **Delete the text:** `anpr-service ⚠️ IMPORTANT!/ $`
6. **Type:** `python anpr.py`
7. **Click "Deploy Web Service"**

That's it! The error should go away! ✅

