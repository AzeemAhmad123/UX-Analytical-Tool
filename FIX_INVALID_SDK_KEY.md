# Fix: "Invalid SDK key" Error (401 Unauthorized)

## 🔍 Problem

You're getting `401 (Unauthorized)` with error `"Invalid SDK key"` even though your SDK key looks correct.

**SDK Key:** `ux_2ce0927ed4aa18342f1719e608cf9ce2`

---

## ✅ Most Likely Cause

After migrating to a **new Supabase project**, your projects table is **empty** or doesn't contain the project with this SDK key.

**The project with this SDK key exists in your OLD database, but not in your NEW database.**

---

## 🔧 Solution

### Step 1: Check if the Project Exists

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **kkgdxfencpyabcmizytn**
3. Go to **SQL Editor**
4. Run this query:

```sql
SELECT 
    id,
    name,
    sdk_key,
    user_id,
    is_active,
    created_at
FROM projects
WHERE sdk_key = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';
```

**If you see NO RESULTS:**
- The project doesn't exist in the new database
- Continue to Step 2

**If you see a result:**
- The project exists, but there might be another issue (see Step 3)

---

### Step 2: Create the Project Again (Recommended)

**Option A: Create via Dashboard (Easiest)**

1. Go to your app's dashboard: https://ux-analytical-tool-ochre.vercel.app
2. Log in with your account
3. Create a **new project**
4. Copy the **new SDK key** from the project settings
5. Update your website's HTML with the new SDK key

**Option B: Manually Insert Project (If you want to keep the same SDK key)**

1. Go to Supabase Dashboard → **SQL Editor**
2. First, get your user ID:

```sql
-- Get your user ID from auth.users
SELECT id, email FROM auth.users LIMIT 5;
```

3. Copy your user ID, then insert the project:

```sql
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from step 2
INSERT INTO projects (
    id,
    user_id,
    name,
    description,
    sdk_key,
    platform,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), -- Generate new UUID
    'YOUR_USER_ID_HERE', -- Replace with your user ID
    'My Project', -- Project name
    'Project description', -- Optional description
    'ux_2ce0927ed4aa18342f1719e608cf9ce2', -- Your SDK key
    'all', -- Platform: 'all', 'web', or 'mobile'
    true, -- is_active
    NOW(),
    NOW()
);
```

4. Verify it was created:

```sql
SELECT * FROM projects WHERE sdk_key = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';
```

---

### Step 3: If Project Exists but Still Getting Error

If the project exists in the database but you're still getting "Invalid SDK key":

1. **Check if project is active:**

```sql
SELECT id, name, sdk_key, is_active 
FROM projects 
WHERE sdk_key = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';
```

If `is_active` is `false`, activate it:

```sql
UPDATE projects 
SET is_active = true 
WHERE sdk_key = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';
```

2. **Check backend logs:**
   - Go to Vercel Dashboard → Your backend project → **Logs**
   - Look for errors when the SDK tries to validate the key
   - Check for database connection errors

3. **Verify backend environment variables:**
   - Go to Vercel Dashboard → Your backend project → **Settings** → **Environment Variables**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
   - They should point to your NEW Supabase project: `kkgdxfencpyabcmizytn.supabase.co`

4. **Redeploy backend:**
   - After updating environment variables, **redeploy the backend**
   - Go to **Deployments** → Click **"..."** → **"Redeploy"**

---

## 🧪 Test After Fixing

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Reload your website** with the SDK
3. **Check browser console** - you should see:
   - ✅ `UXCam SDK: ✓ Initialized`
   - ✅ `UXCam SDK: Type 2 snapshot captured`
   - ✅ `UXCam SDK: Uploading Type 2 snapshot...`
   - ✅ No more `401 (Unauthorized)` errors

4. **Check your dashboard:**
   - Go to your app's dashboard
   - You should see the session appear in the sessions list

---

## 📝 Quick Checklist

- [ ] Checked if project exists in new database
- [ ] Created project (via dashboard or SQL)
- [ ] Updated SDK key in website HTML (if using new key)
- [ ] Verified `is_active = true` for the project
- [ ] Checked backend environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)
- [ ] Redeployed backend after env var changes
- [ ] Cleared browser cache
- [ ] Tested again

---

## 🆘 Still Not Working?

If you've tried everything above:

1. **Check Vercel backend logs** for detailed error messages
2. **Check Supabase logs** (Dashboard → Logs → API Logs)
3. **Verify the SDK key format** - it should start with `ux_` and be 32+ characters
4. **Try creating a completely new project** with a fresh SDK key

---

## Summary

**The issue:** Project doesn't exist in new Supabase database after migration.

**The fix:** Create the project again (either via dashboard or SQL), then update your website with the correct SDK key.
