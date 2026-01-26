# ✅ Complete Verification Checklist - New Supabase Project

## 🔍 Verify Everything is Set to NEW Project

Use this checklist to ensure **ALL** references point to the **NEW** Supabase project (`kkgdxfencpyabcmizytn`), not the old one (`xrvmiyrsxwrruhdljkoz`).

---

## ✅ 1. Vercel Backend Environment Variables

**Go to:** Vercel Dashboard → `ux-analytical-tool-gzsn` → Settings → Environment Variables

**Verify:**
- [ ] `SUPABASE_URL` = `https://kkgdxfencpyabcmizytn.supabase.co` ✅
- [ ] `SUPABASE_SERVICE_KEY` = Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ✅
- [ ] **NOT** `https://xrvmiyrsxwrruhdljkoz.supabase.co` ❌

**After updating:** Redeploy backend (uncheck "Use existing Build Cache")

---

## ✅ 2. Vercel Frontend Environment Variables

**Go to:** Vercel Dashboard → `ux-analytical-tool-ochre` (or your frontend project) → Settings → Environment Variables

**Verify:**
- [ ] `VITE_SUPABASE_URL` = `https://kkgdxfencpyabcmizytn.supabase.co` ✅
- [ ] `VITE_SUPABASE_ANON_KEY` = Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ✅
- [ ] **NOT** `https://xrvmiyrsxwrruhdljkoz.supabase.co` ❌

**After updating:** Redeploy frontend (uncheck "Use existing Build Cache")

---

## ✅ 3. Backend Code (Already Fixed)

**File:** `backend/src/config/supabase.ts`

**Status:** ✅ **FIXED** - Now uses new project as fallback:
```typescript
const supabaseUrl = process.env.SUPABASE_URL || 'https://kkgdxfencpyabcmizytn.supabase.co'
```

**Verify in code:**
- [ ] Line 6: Uses `kkgdxfencpyabcmizytn` ✅
- [ ] **NOT** `xrvmiyrsxwrruhdljkoz` ❌

---

## ✅ 4. Frontend Code (Already Fixed)

**File:** `frontend/src/config/supabase.ts`

**Status:** ✅ **FIXED** - Already uses new project:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kkgdxfencpyabcmizytn.supabase.co'
```

**Verify in code:**
- [ ] Line 6: Uses `kkgdxfencpyabcmizytn` ✅
- [ ] **NOT** `xrvmiyrsxwrruhdljkoz` ❌

---

## ✅ 5. Check Backend Logs After Redeploy

**Go to:** Vercel Dashboard → `ux-analytical-tool-gzsn` → Deployments → Latest → Functions → View Logs

**Look for:**
```
🔍 Backend Supabase Config: {
  envUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  usedUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  isNewProject: true,
  isOldProject: false
}
```

**If you see:**
- ❌ `isOldProject: true` → Environment variable not set correctly
- ❌ `envUrl: 'NOT SET'` → Environment variable missing in Vercel

---

## ✅ 6. Check Frontend Console (Browser)

**Open:** Your frontend website → Open Browser Console (F12)

**Look for:**
```
🔍 Supabase Config Debug: {
  envUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  usedUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  isNewProject: true,
  isOldProject: false
}
```

**If you see:**
- ❌ `isOldProject: true` → Environment variable not set correctly
- ❌ `envUrl: undefined` → Environment variable missing in Vercel

---

## ✅ 7. Verify Database Connection

**Go to:** Supabase Dashboard → `kkgdxfencpyabcmizytn` → SQL Editor

**Run:**
```sql
SELECT id, name, sdk_key, is_active 
FROM projects 
WHERE sdk_key = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';
```

**Expected:** Should return 1 row with your project ✅

**If no results:** Project doesn't exist in new database (create it via dashboard)

---

## ✅ 8. Test SDK Key Validation

**After redeploying backend:**

1. Clear browser cache (Ctrl+Shift+Delete)
2. Reload your website with SDK
3. Check browser console

**Should see:**
- ✅ `UXCam SDK: ✓ Initialized`
- ✅ `UXCam SDK: Type 2 snapshot captured`
- ✅ No `401 (Unauthorized)` errors
- ✅ No "Invalid SDK key" errors

**If still getting errors:**
- Check backend logs for SDK key validation
- Verify project exists in new database (Step 7)
- Verify backend is using new Supabase URL (Step 5)

---

## 📋 Quick Summary

**All these should point to NEW project:**
- ✅ Vercel Backend `SUPABASE_URL`
- ✅ Vercel Backend `SUPABASE_SERVICE_KEY`
- ✅ Vercel Frontend `VITE_SUPABASE_URL`
- ✅ Vercel Frontend `VITE_SUPABASE_ANON_KEY`
- ✅ Backend code fallback URL
- ✅ Frontend code fallback URL

**None should contain:**
- ❌ `xrvmiyrsxwrruhdljkoz` (old project)

---

## 🆘 Still Not Working?

If you've verified everything above but still getting errors:

1. **Force clean redeploy:**
   - Go to Deployments → Click "..." → Redeploy
   - **Uncheck "Use existing Build Cache"**
   - Wait for deployment to complete

2. **Check backend function logs:**
   - Look for the debug log: `🔍 Backend Supabase Config:`
   - Verify `isNewProject: true` and `isOldProject: false`

3. **Check frontend console:**
   - Look for the debug log: `🔍 Supabase Config Debug:`
   - Verify `isNewProject: true` and `isOldProject: false`

4. **Verify database:**
   - Make sure project exists in new Supabase database
   - Run SQL query from Step 7

---

## Summary

✅ **Code is fixed** - Both frontend and backend now use new project as fallback.

✅ **You need to verify:**
- Vercel environment variables are set correctly
- Redeploy both frontend and backend after any changes
- Check logs to confirm which Supabase project is being used

The backend code has been updated and pushed to GitHub. After you redeploy, check the logs to confirm it's using the new project!
