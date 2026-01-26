# Fix: Frontend Still Using Old Supabase URL

## Problem
Your frontend is still calling the **OLD** Supabase project:
- ❌ `https://xrvmiyrsxwrruhdljkoz.supabase.co` (OLD)
- ✅ Should be: `https://kkgdxfencpyabcmizytn.supabase.co` (NEW)

## Solution Steps

### Step 1: Verify Vercel Environment Variables

1. Go to your **frontend project** in Vercel: `ux-analytical-tool-ochre`
2. Go to **Settings** → **Environment Variables**
3. **Check these variables exist and have correct values:**

   **`VITE_SUPABASE_URL`**
   - Should be: `https://kkgdxfencpyabcmizytn.supabase.co`
   - NOT: `https://xrvmiyrsxwrruhdljkoz.supabase.co`

   **`VITE_SUPABASE_ANON_KEY`**
   - Should be: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIxNTMsImV4cCI6MjA4NDc1ODE1M30.6zx9s2QaGVZXAZgliwH3Uvrr9IkQQ9-uvpNG6y5inV0`

4. **If values are wrong:**
   - Click **"Edit"** on each variable
   - Update the value
   - Click **"Save"**
   - **IMPORTANT:** Make sure you select **"All Environments"** in the dropdown

### Step 2: Force Redeploy Frontend

**Option A: Redeploy from Vercel Dashboard**

1. Go to your frontend project in Vercel
2. Click **"Deployments"** tab
3. Find the latest deployment
4. Click the **three dots** (⋯) menu
5. Click **"Redeploy"**
6. **IMPORTANT:** Check the box **"Use existing Build Cache"** - **UNCHECK IT**
7. Click **"Redeploy"**
8. Wait 3-5 minutes for deployment to complete

**Option B: Push Empty Commit (Forces Rebuild)**

```bash
git commit --allow-empty -m "Force redeploy with new Supabase config"
git push origin main
```

This will trigger a new deployment that picks up the environment variables.

### Step 3: Clear Browser Cache

After redeployment:

1. **Hard refresh** your browser:
   - **Chrome/Edge:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - **Firefox:** `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

2. **Or clear cache completely:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Click **"Empty Cache and Hard Reload"**

### Step 4: Verify It's Fixed

1. Open your frontend: `https://ux-analytical-tool-ochre.vercel.app`
2. Open **Browser DevTools** (F12)
3. Go to **Console** tab
4. Try to register a new account
5. **Check the network request:**
   - Go to **Network** tab
   - Look for requests to Supabase
   - The URL should be: `https://kkgdxfencpyabcmizytn.supabase.co`
   - NOT: `https://xrvmiyrsxwrruhdljkoz.supabase.co`

### Step 5: Debug Environment Variables (If Still Not Working)

Add this temporary debug code to see what URL is being used:

1. Open browser console on your frontend
2. Type this command:
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   ```
3. This will show what URL the frontend is actually using

**OR** check the built JavaScript:
1. Open DevTools → **Network** tab
2. Reload page
3. Find `index-*.js` file
4. Search for `xrvmiyrsxwrruhdljkoz` in that file
5. If you find it, the build is using old values

---

## Common Issues

### Issue 1: Environment Variable Not Set
**Symptom:** Console shows `undefined` for `VITE_SUPABASE_URL`
**Fix:** Make sure variable is set in Vercel and redeployed

### Issue 2: Wrong Environment Selected
**Symptom:** Variable exists but has wrong value
**Fix:** Make sure you selected **"All Environments"** when saving

### Issue 3: Build Cache
**Symptom:** Redeployed but still using old URL
**Fix:** Redeploy with **"Use existing Build Cache"** **UNCHECKED**

### Issue 4: Browser Cache
**Symptom:** Old JavaScript still loading
**Fix:** Hard refresh or clear browser cache

---

## Quick Checklist

- [ ] `VITE_SUPABASE_URL` in Vercel = `https://kkgdxfencpyabcmizytn.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` in Vercel = new anon key
- [ ] Both variables set for **"All Environments"**
- [ ] Frontend redeployed (with cache disabled)
- [ ] Browser cache cleared
- [ ] Network tab shows new Supabase URL
- [ ] Can create new account successfully

---

## Still Not Working?

If after all these steps it's still using the old URL:

1. **Check if there are multiple environment variables:**
   - Look for any variable with similar names
   - Delete old/duplicate variables

2. **Check Vercel deployment logs:**
   - Go to **Deployments** → Click on latest deployment
   - Check **"Build Logs"**
   - Look for environment variable warnings

3. **Verify the build is using env vars:**
   - The build should show: `VITE_SUPABASE_URL=https://kkgdxfencpyabcmizytn.supabase.co`
   - If it shows the old URL, the env var isn't being picked up

4. **Contact me with:**
   - Screenshot of Vercel environment variables
   - Screenshot of browser console showing the old URL
   - Deployment logs from Vercel
