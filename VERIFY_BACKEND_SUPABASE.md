# Verify Backend is Using Correct Supabase Project

## 🔍 Problem

Your project exists in the database, but you're still getting "Invalid SDK key" errors. This means the **backend is connecting to the WRONG Supabase project**.

---

## ✅ Solution: Verify Vercel Environment Variables

### Step 1: Check Vercel Backend Environment Variables

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your **backend project** (likely `ux-analytical-tool-gzsn` or similar)
3. Go to **Settings** → **Environment Variables**
4. Verify these variables are set:

**Required Variables:**
- `SUPABASE_URL` = `https://kkgdxfencpyabcmizytn.supabase.co`
- `SUPABASE_SERVICE_KEY` = Your service role key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**⚠️ IMPORTANT:** Make sure `SUPABASE_URL` does NOT contain `xrvmiyrsxwrruhdljkoz` (old project)

---

### Step 2: Redeploy Backend

**After updating environment variables, you MUST redeploy:**

1. Go to **Deployments** tab
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. **IMPORTANT:** Uncheck **"Use existing Build Cache"** to force a clean rebuild
5. Wait for deployment to complete

---

### Step 3: Check Backend Logs

After redeploying, check the logs to verify which Supabase URL is being used:

1. Go to **Deployments** → Click on the latest deployment
2. Go to **"Functions"** tab
3. Look for startup logs that show:
   ```
   🔍 Backend Supabase Config: {
     envUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
     usedUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
     isNewProject: true,
     isOldProject: false
   }
   ```

**If you see `isOldProject: true`, the environment variable is not set correctly!**

---

## 🧪 Test SDK Key Validation

After redeploying, when the SDK tries to validate a key, check the logs for:

```
🔍 Validating SDK key: {
  sdkKeyPrefix: 'ux_2ce0927ed4aa...',
  supabaseUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  isNewProject: true,
  isOldProject: false
}
```

**If `isOldProject: true`, the backend is still using the old database!**

---

## 📋 Quick Checklist

- [ ] Verified `SUPABASE_URL` in Vercel = `https://kkgdxfencpyabcmizytn.supabase.co`
- [ ] Verified `SUPABASE_SERVICE_KEY` is set correctly
- [ ] Redeployed backend (with cache disabled)
- [ ] Checked backend logs show `isNewProject: true`
- [ ] Tested SDK key validation again

---

## 🆘 Still Not Working?

If you've verified everything above but still getting errors:

1. **Check if RLS policies are blocking service role:**
   - Go to Supabase Dashboard → **SQL Editor**
   - Run this to check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'projects';
   ```
   - Make sure there's a policy allowing `service_role` to SELECT from projects

2. **Test direct database query:**
   ```sql
   -- In Supabase SQL Editor, run as service_role
   SELECT id, name, sdk_key, is_active 
   FROM projects 
   WHERE sdk_key = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';
   ```
   - If this works but backend doesn't, it's an RLS or connection issue

3. **Check backend function logs for detailed errors:**
   - Look for any error messages about database connection
   - Look for RLS policy violations

---

## Summary

**The fix:** Update `SUPABASE_URL` environment variable in Vercel to point to your new project (`kkgdxfencpyabcmizytn.supabase.co`), then **redeploy the backend**.

The code has been updated to use the new project as fallback, but you should still set the environment variable explicitly in Vercel.
