# Render ALPR Service Configuration

## Fix These Fields:

### 1. **Name** (at the top)
```
park-wise-alpr
```
(Or any name you like)

### 2. **Root Directory**
**Current (WRONG):** `alpr/anpr-set-up/ $`

**Should be:**
```
alpr/anpr-set-up
```
⚠️ Remove the `$` at the end! Just: `alpr/anpr-set-up`

### 3. **Build Command**
**Current (WRONG):** `alpr/anpr-set-up/ $`

**Should be:**
```
pip install -r requirements.txt
```

### 4. **Start Command**
**Current (WRONG):** `alpr/anpr-set-up/ $`

**Should be:**
```
python app.py
```

### 5. **Instance Type**
✅ **Free** is fine for now (can upgrade later if needed)

---

## Complete Configuration Summary:

- **Name:** `park-wise-alpr`
- **Source Code:** `markk0042 / Park-Wise` ✅
- **Project:** My project (or leave blank)
- **Environment:** Production ✅
- **Language:** Python 3 ✅
- **Branch:** main ✅
- **Region:** Oregon (US West) ✅
- **Root Directory:** `alpr/anpr-set-up` ⚠️ FIX THIS
- **Build Command:** `pip install -r requirements.txt` ⚠️ FIX THIS
- **Start Command:** `python app.py` ⚠️ FIX THIS
- **Instance Type:** Free ✅

---

## Steps to Fix:

1. **Clear the Root Directory field** and type: `alpr/anpr-set-up`
2. **Clear the Build Command field** and type: `pip install -r requirements.txt`
3. **Clear the Start Command field** and type: `python app.py`
4. **Add a Name** at the top: `park-wise-alpr`
5. **Click "Deploy Web Service"**

---

## After Deployment:

1. Wait for build to complete (10-15 minutes first time)
2. Copy the service URL (e.g., `https://park-wise-alpr.onrender.com`)
3. Update backend environment variable `ALPR_SERVICE_URL` with this URL
4. Redeploy backend

Good luck! 🚀

