# ✅ Vercel Deploy Checklist - Fix Before Deploying!

## 🚨 CRITICAL: Fix These Before Deploying!

### 1. Framework Preset
- ❌ **Current:** "Express"
- ✅ **Change to:** "Other" (or leave blank)

**Why:** Setting it to "Express" makes Vercel look in the wrong place for the entrypoint.

---

### 2. Environment Variables - FIX THESE (They're Truncated!)

#### ❌ SUPABASE_SERVICE_KEY (Currently Truncated)
**Current (WRONG):** `eyJhbGciOiJlUzI1NilsInR5cCI6IkpXVCJ9`

**Correct (FULL):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjE1MywiZXhwIjoyMDg0NzU4MTUzfQ.3XXlRE8_JePIY2h_MyMWjgTLM8YPBjwJ1F0589vOXmw
```

#### ❌ SUPABASE_URL (Currently Truncated)
**Current (WRONG):** `https://kkgdxfencpyabcmizytn.supabase`

**Correct:**
```
https://kkgdxfencpyabcmizytn.supabase.co
```

#### ❌ CORS_ORIGINS (Currently Truncated)
**Current (WRONG):** `https://ux-analytical-tool-ochre.vercel.ap`

**Correct (Full list):**
```
https://ux-analytical-tool-ochre.vercel.app,https://ux-analytical-tool-zace.vercel.app,https://perfume-shop-git-main-azeemkhattak60-2583s-projects.vercel.app,https://*.vercel.app
```

---

### 3. Build Command
- ✅ **Current:** `npm run build` (This is OK - you can keep it)
- ✅ **OR:** Leave it empty (Vercel will handle TypeScript)

Both options work, but leaving it empty is simpler.

---

## ✅ Correct Settings Summary

**Project Settings:**
- ✅ **Root Directory:** `backend` ✓
- ✅ **Framework Preset:** **Other** (or blank) ⚠️ CHANGE THIS
- ✅ **Build Command:** `npm run build` OR leave empty ✓
- ✅ **Output Directory:** Leave empty ✓
- ✅ **Install Command:** `npm install` ✓

**Environment Variables:**
- ✅ **SUPABASE_URL:** `https://kkgdxfencpyabcmizytn.supabase.co` ⚠️ FIX (add `.co`)
- ✅ **SUPABASE_SERVICE_KEY:** (Full JWT token - see above) ⚠️ FIX (add full token)
- ✅ **CORS_ORIGINS:** (Full list - see above) ⚠️ FIX (add full list)
- ✅ **NODE_ENV:** `production` ✓

---

## 🚀 Steps to Fix

1. **Change Framework Preset:**
   - Click the dropdown next to "Framework Preset"
   - Select "Other" or leave blank

2. **Fix Environment Variables:**
   - Click on each truncated variable
   - Replace with the FULL correct value (see above)
   - Make sure there are NO spaces or line breaks

3. **Verify:**
   - All environment variables show the FULL values
   - Framework Preset is "Other" or blank
   - Root Directory is `backend`

4. **Then click "Deploy"!**

---

## ⚠️ Important Notes

- **Environment variables MUST be complete** - truncated values will cause errors
- **Framework Preset MUST be "Other"** - "Express" will cause entrypoint detection issues
- **Double-check** all values before deploying

---

## ✅ After Deploying

Check the logs for:
- ✅ No "No entrypoint found" errors
- ✅ `🔍 Backend Supabase Config:` showing correct Supabase URL
- ✅ No 401/404 errors

Good luck! 🚀
