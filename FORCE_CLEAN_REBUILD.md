# Force Clean Rebuild - Fix Old Supabase URL Issue

## The Problem
Even after updating environment variables and redeploying, the frontend is still using the old Supabase URL (`xrvmiyrsxwrruhdljkoz.supabase.co`).

## Root Cause
Vercel may be:
1. Using cached build artifacts
2. Not passing environment variables to the build
3. Environment variables set for wrong environment (Preview vs Production)

## Solution: Force Complete Clean Rebuild

### Step 1: Verify Environment Variables in Vercel

1. Go to your **frontend project** in Vercel: `ux-analytical-tool-ochre`
2. Go to **Settings** → **Environment Variables**
3. **Check these variables exist:**

   **`VITE_SUPABASE_URL`**
   - Value: `https://kkgdxfencpyabcmizytn.supabase.co`
   - Environment: **"All Environments"** (or at least "Production")
   - ⚠️ If it shows the old URL, **DELETE it and recreate it**

   **`VITE_SUPABASE_ANON_KEY`**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIxNTMsImV4cCI6MjA4NDc1ODE1M30.6zx9s2QaGVZXAZgliwH3Uvrr9IkQQ9-uvpNG6y5inV0`
   - Environment: **"All Environments"**

4. **If variables have wrong values:**
   - Click **three dots** (⋯) → **Delete**
   - Click **"Add New"**
   - Re-enter the correct values
   - Make sure **"All Environments"** is selected

### Step 2: Delete Old Deployment (Optional but Recommended)

1. Go to **Deployments** tab
2. Find deployments that might have old cached builds
3. Click **three dots** (⋯) → **Delete** (on old deployments, not the latest)

### Step 3: Force Clean Rebuild

**Method 1: Redeploy with Cache Disabled**

1. Go to **Deployments** tab
2. Click **three dots** (⋯) on the latest deployment
3. Click **"Redeploy"**
4. **IMPORTANT:** In the dialog, **UNCHECK** "Use existing Build Cache"
5. Click **"Redeploy"**
6. Wait for build to complete (3-5 minutes)

**Method 2: Push Empty Commit (Recommended)**

This forces a completely fresh build:

```bash
git commit --allow-empty -m "Force clean rebuild with new Supabase config"
git push origin main
```

This will trigger a new deployment that:
- Uses fresh build cache
- Picks up latest environment variables
- Rebuilds everything from scratch

### Step 4: Check Build Logs

After deployment starts:

1. Click on the new deployment
2. Go to **"Build Logs"** tab
3. **Look for environment variables in the logs:**
   - Search for `VITE_SUPABASE_URL`
   - It should show: `https://kkgdxfencpyabcmizytn.supabase.co`
   - If it shows the old URL, the env var isn't being picked up

### Step 5: Verify in Browser

After deployment completes:

1. Go to your frontend: `https://ux-analytical-tool-ochre.vercel.app`
2. Open **Browser DevTools** (F12)
3. Go to **Console** tab
4. You should see a debug log: `🔍 Supabase Config Debug:`
5. Check the values:
   - `usedUrl` should be: `https://kkgdxfencpyabcmizytn.supabase.co`
   - `isNewProject` should be: `true`
   - `isOldProject` should be: `false`

6. If you see `❌ ERROR: Still using OLD Supabase project!`, the env vars aren't set correctly

### Step 6: Clear Browser Cache

1. **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Or clear cache completely:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Click **"Empty Cache and Hard Reload"**

### Step 7: Test Registration

1. Go to registration page
2. Try to create account with `test1@gmail.com`
3. Open **Network** tab in DevTools
4. Look for the Supabase request
5. The URL should be: `https://kkgdxfencpyabcmizytn.supabase.co/auth/v1/signup`
6. **NOT:** `https://xrvmiyrsxwrruhdljkoz.supabase.co/auth/v1/signup`

---

## If Still Not Working

### Check Build Logs for Environment Variables

1. Go to deployment → **Build Logs**
2. Look for lines like:
   ```
   VITE_SUPABASE_URL=https://...
   ```
3. If you see the old URL, the environment variable isn't set correctly

### Verify Environment Variable Scope

Make sure environment variables are set for **"Production"** environment:
1. In Vercel → Environment Variables
2. Click on each variable
3. Check **"Environments"** dropdown
4. Make sure **"Production"** is checked (or "All Environments")

### Nuclear Option: Delete and Recreate Project

If nothing works:
1. Note down all environment variables
2. Delete the Vercel project
3. Reconnect to GitHub
4. Re-add all environment variables
5. Deploy fresh

---

## Quick Checklist

- [ ] `VITE_SUPABASE_URL` = `https://kkgdxfencpyabcmizytn.supabase.co` (NEW)
- [ ] `VITE_SUPABASE_ANON_KEY` = new anon key
- [ ] Both set for **"All Environments"** or at least **"Production"**
- [ ] Deleted old deployments (optional)
- [ ] Redeployed with **cache disabled**
- [ ] Checked build logs show correct URL
- [ ] Browser console shows debug log with new URL
- [ ] Network tab shows requests to new Supabase URL
- [ ] Can create new account successfully

---

## Expected Result

After completing all steps:
- ✅ Browser console shows: `isNewProject: true`
- ✅ Network requests go to: `kkgdxfencpyabcmizytn.supabase.co`
- ✅ Can create new accounts
- ✅ No more "account already exists" error (for new accounts)
