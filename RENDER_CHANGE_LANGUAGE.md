# Fix: Change Language from Node to Python

## The Problem

Render detected your repo and auto-filled **Node.js** commands, but you need **Python** commands!

That's why:
- Build Command shows: `anpr-service ⚠️ IMPORTANT!/ $` (Node.js placeholder)
- Start Command shows: `anpr-service ⚠️ IMPORTANT!/ $` (Node.js placeholder)
- You can't edit them (they're locked based on Language)

## The Fix

**Change the Language field from "Node" to "Python"**

### Step-by-Step:

1. **Find the "Language" dropdown** (near the top of the form)
2. **It currently says:** `Node`
3. **Click the dropdown**
4. **Select:** `Python`
5. **Now the Build Command and Start Command fields will unlock!**
6. **They should auto-fill with Python commands, or you can edit them**

## After Changing to Python

Once you select "Python", Render should auto-fill:

**Build Command:**
```
pip install -r requirements.txt
```

**Start Command:**
```
python anpr.py
```

If they don't auto-fill, you can now edit them manually!

## Complete Settings After Fix

```
Language: Python ✅ (CHANGE THIS!)
Root Directory: anpr-service ✅
Build Command: pip install -r requirements.txt ✅
Start Command: python anpr.py ✅
Instance Type: Free ✅
Health Check Path: /health ✅
Auto-Deploy: On Commit ✅
```

## Why This Happened

Render saw your repo has both:
- `server/` folder (Node.js backend)
- `anpr-service/` folder (Python service)

It defaulted to Node.js, but you need Python for the ANPR service!

**Solution: Change Language to Python!** 🐍

