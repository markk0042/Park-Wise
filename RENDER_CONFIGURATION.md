# Render Configuration for ANPR Service

## Recommended Settings

### 1. Health Check Path ✅

**Path:** `/health`

**Why:** The Python service has a `/health` endpoint that returns service status. This allows Render to monitor if your service is running.

**What it does:**
- Render pings this endpoint periodically
- If it fails, Render knows the service is down
- Helps with automatic restarts

**Set it to:** `/health`

---

### 2. Pre-Deploy Command

**Leave this EMPTY** (blank)

**Why:** 
- No database migrations needed
- No static assets to upload
- Dependencies are installed via `Build Command`
- Service is ready to start after build

**Set it to:** (leave blank/empty)

---

### 3. Auto-Deploy

**Choose:** **On Commit** ✅

**Options:**
- **Off** - Manual deployment only
- **On Commit** - Deploys automatically when you push to GitHub ✅ **RECOMMENDED**
- **After CI checks pass** - Waits for CI/CD pipeline to pass (if you have one)

**Why "On Commit":**
- Automatically deploys when you push code changes
- Saves time - no manual deployment needed
- Keeps service up-to-date
- Works immediately without waiting for CI

**Set it to:** **On Commit** ✅

---

### 4. Build Filters

#### Included Paths (Optional)

**You can leave this empty**, OR add:

```
anpr-service/**
```

**Why:**
- Only redeploy when `anpr-service` folder changes
- Ignores changes to other parts of repo
- Saves build time

**Recommended:** Leave empty (deploys on any change) OR add `anpr-service/**`

#### Ignored Paths (Optional)

**You can leave this empty**, OR add:

```
README.md
*.md
.gitignore
server/**
src/**
```

**Why:**
- Don't redeploy when documentation changes
- Don't redeploy when frontend/backend changes
- Only redeploy when ANPR service code changes

**Recommended:** Leave empty OR add:
```
*.md
server/**
src/**
```

---

## Complete Configuration Summary

### Required Settings:
- **Health Check Path:** `/health`
- **Pre-Deploy Command:** (leave empty)
- **Auto-Deploy:** ✅ Enabled

### Optional Settings:
- **Included Paths:** `anpr-service/**` (optional)
- **Ignored Paths:** `*.md`, `server/**`, `src/**` (optional)

---

## Quick Setup

### Minimal (Recommended):
1. **Health Check Path:** `/health`
2. **Pre-Deploy Command:** (empty)
3. **Auto-Deploy:** ✅ Enabled
4. **Build Filters:** (leave empty)

### Advanced (Optional):
1. **Health Check Path:** `/health`
2. **Pre-Deploy Command:** (empty)
3. **Auto-Deploy:** ✅ Enabled
4. **Included Paths:** `anpr-service/**`
5. **Ignored Paths:** `*.md`, `server/**`, `src/**`

---

## What Each Setting Does

### Health Check Path (`/health`)
- Render pings this every few minutes
- Checks if service is alive
- Triggers restart if service is down
- **Required for monitoring**

### Pre-Deploy Command
- Runs BEFORE service starts
- Use for: migrations, setup scripts
- **Not needed for ANPR service**

### Auto-Deploy
- Deploys automatically on git push
- **Recommended: Enable**

### Build Filters
- Control when to trigger builds
- **Optional: Can leave empty**

---

## My Recommendation

**Use these exact settings:**

```
Health Check Path: /health
Pre-Deploy Command: (empty)
Auto-Deploy: ✅ Enabled
Included Paths: (empty)
Ignored Paths: (empty)
```

**Why:**
- Simple and works
- Health check monitors service
- Auto-deploy keeps it updated
- No complex filters needed

**That's it!** These settings will work perfectly for your ANPR service.

