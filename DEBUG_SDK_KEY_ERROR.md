# Debug: "Invalid SDK key" Error - Step by Step

## 🔍 Current Status

You're getting `401 (Unauthorized)` with `"Invalid SDK key"` even though:
- ✅ Project exists in database
- ✅ Vercel environment variables are set correctly
- ✅ SDK key is correct: `ux_2ce0927ed4aa18342f1719e608cf9ce2`

---

## 🎯 Most Likely Causes

### 1. Backend Not Redeployed After Environment Variable Changes

**Problem:** Vercel environment variables don't apply until you redeploy.

**Solution:**
1. Go to Vercel Dashboard → `ux-analytical-tool-gzsn` → **Deployments**
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
4. **IMPORTANT:** Uncheck **"Use existing Build Cache"**
5. Wait for deployment to complete (2-3 minutes)

---

### 2. Backend Still Using Old Supabase Project

**Problem:** Even with environment variables set, the backend might be cached or not reading them.

**Solution:**
1. After redeploying, check backend logs:
   - Go to **Deployments** → Latest → **Functions** → **View Logs**
2. Look for this log message:
   ```
   🔍 Backend Supabase Config: {
     envUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
     usedUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
     isNewProject: true,
     isOldProject: false
   }
   ```
3. **If you see `isOldProject: true`:** Environment variable is not being read correctly

---

### 3. Database Connection Issue

**Problem:** Backend can't connect to Supabase database.

**Solution:**
1. Check backend logs for connection errors:
   - Look for: `❌ Supabase connection test failed`
   - Look for: `520` errors
   - Look for: `Database connection error`

2. Verify Supabase project is healthy:
   - Go to Supabase Dashboard → `kkgdxfencpyabcmizytn`
   - Check if all services are "Healthy"

---

## 🔧 Step-by-Step Debugging

### Step 1: Test SDK Key Locally

1. **Create test file:** `backend/test-sdk-key.js` (already created)
2. **Run it:**
   ```bash
   cd backend
   node test-sdk-key.js
   ```

3. **Expected output:**
   ```
   ✅ SDK Key Found!
     Project ID: 09a51bd7-ac87-460e-a7af-d0d0be7af956
     Project Name: test
     SDK Key: ux_2ce0927ed4aa18342f1719e608cf9ce2
     Is Active: true
   ```

4. **If it fails:**
   - Check your `backend/.env` file
   - Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly

---

### Step 2: Check Backend Logs on Vercel

1. **Go to:** Vercel Dashboard → `ux-analytical-tool-gzsn` → **Deployments**
2. **Click:** Latest deployment
3. **Go to:** **Functions** tab
4. **Click:** **View Logs**
5. **Look for:**
   - `🔍 Backend Supabase Config:` - Shows which Supabase project is being used
   - `🔍 Validating SDK key:` - Shows SDK key validation attempts
   - `❌ Supabase error validating SDK key:` - Shows validation errors

---

### Step 3: Verify Environment Variables in Vercel

1. **Go to:** Vercel Dashboard → `ux-analytical-tool-gzsn` → **Settings** → **Environment Variables**
2. **Verify:**
   - `SUPABASE_URL` = `https://kkgdxfencpyabcmizytn.supabase.co`
   - `SUPABASE_SERVICE_KEY` = Your service role key (starts with `eyJhbGci...`)
3. **Check:** Make sure they're set for **"Production"** environment
4. **If missing or wrong:** Update them, then **redeploy**

---

### Step 4: Force Clean Redeploy

1. **Go to:** Vercel Dashboard → `ux-analytical-tool-gzsn` → **Deployments**
2. **Click:** **"..."** (three dots) on latest deployment
3. **Click:** **"Redeploy"**
4. **IMPORTANT:** Uncheck **"Use existing Build Cache"**
5. **Click:** **"Redeploy"**
6. **Wait:** 2-3 minutes for deployment to complete

---

### Step 5: Test After Redeploy

1. **Wait for deployment to complete**
2. **Check backend logs** (Step 2) to verify it's using new project
3. **Clear browser cache** (Ctrl+Shift+Delete)
4. **Reload your website** with SDK
5. **Check browser console:**
   - Should see: `UXCam SDK: ✓ Initialized`
   - Should see: `UXCam SDK: Type 2 snapshot captured`
   - Should **NOT** see: `401 (Unauthorized)` or `Invalid SDK key`

---

## 🆘 Still Not Working?

If you've done all the above but still getting errors:

### Check Backend Function Logs

1. **Go to:** Vercel Dashboard → `ux-analytical-tool-gzsn` → **Deployments** → Latest
2. **Go to:** **Functions** → **View Logs**
3. **Look for errors when SDK tries to validate:**
   - `🔍 Validating SDK key:` - Should show `isNewProject: true`
   - `❌ Supabase error validating SDK key:` - Shows the actual error

### Common Error Messages:

**Error: `PGRST116` (No rows found)**
- **Meaning:** SDK key not found in database
- **Fix:** Verify project exists in new Supabase database

**Error: `520` or `Web server`**
- **Meaning:** Database connection error
- **Fix:** Check Supabase project health, verify service key is correct

**Error: `Invalid SDK key`**
- **Meaning:** Query returned no results
- **Fix:** Check if project exists, verify backend is using correct database

---

## 📋 Quick Checklist

- [ ] Backend redeployed after environment variable changes
- [ ] Backend logs show `isNewProject: true`
- [ ] Backend logs show `isOldProject: false`
- [ ] `SUPABASE_URL` in Vercel = `https://kkgdxfencpyabcmizytn.supabase.co`
- [ ] `SUPABASE_SERVICE_KEY` in Vercel is set correctly
- [ ] Project exists in new Supabase database (verified via SQL query)
- [ ] Browser cache cleared
- [ ] Tested after redeploy

---

## Summary

**The most common issue:** Backend not redeployed after setting environment variables.

**The fix:**
1. Redeploy backend (with cache disabled)
2. Check logs to verify it's using new project
3. Test again

The code is correct, your environment variables are set correctly, but Vercel needs a redeploy to pick up the changes!
