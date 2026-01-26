# Fix: "Invalid SDK key" - Step by Step Debugging

## 🔍 Step 1: Check What SDK Key Is Actually Being Used

### In Browser Console:

1. **Open your portfolio:** `https://portfolio-gamma-lake-28.vercel.app`
2. **Open browser console** (F12)
3. **Find this line:** `UXCam SDK Config: Object`
4. **Click on "Object"** to expand it
5. **Look for the `key` property**
6. **What key does it show?**
   - ✅ Should be: `ux_f5cd75623e2442f2cce75a195250a24f`
   - ❌ If it's: `ux_a70c491fc4b948514e0f2e8c5ba9e20f` → Browser is still caching old HTML!

---

## 🔍 Step 2: Check Network Request

1. **Go to Network tab** in console
2. **Find the failed request:** `POST .../api/snapshots/ingest` (red, 401)
3. **Click on it**
4. **Go to "Payload" or "Request" tab**
5. **Look for `sdk_key` in the request body**
6. **What key is being sent?**
   - ✅ Should be: `ux_f5cd75623e2442f2cce75a195250a24f`
   - ❌ If it's different → That's the problem!

---

## 🔍 Step 3: Check Backend Logs

The backend logs what SDK key it receives. Let's check:

1. **Go to Vercel:** `https://vercel.com`
2. **Go to your backend project:** `ux-analytical-tool-zbgu`
3. **Click "Logs" tab**
4. **Look for:** `🔍 Validating SDK key:`
5. **Check:**
   - What `sdkKeyPrefix` shows? (first 20 chars)
   - What `supabaseUrl` shows? (should be `kkgdxfencpyabcmizytn.supabase.co`)
   - Does it show `isNewProject: true`? ✅
   - Does it show `isOldProject: false`? ✅

6. **Also look for:** `❌ Supabase error validating SDK key:`
   - What error code? (`PGRST116` = not found)
   - What `sdkKey` is shown?

---

## 🔍 Step 4: Verify SDK Key in Database

1. **Go to Supabase:** `https://supabase.com/dashboard/project/kkgdxfencpyabcmizytn`
2. **Go to Table Editor** → **projects** table
3. **Check:**
   - Does `ux_f5cd75623e2442f2cce75a195250a24f` exist? ✅
   - Is `is_active` = `true`? ✅
   - What's the `name` of the project?

---

## 🔍 Step 5: Check Your HTML File on GitHub

1. **Go to GitHub:** `https://github.com/AzeemAhmad123/Portfolio`
2. **View `index.html`** (raw file)
3. **Search for:** `key:`
4. **What SDK key is in the file?**
   - ✅ Should be: `ux_f5cd75623e2442f2cce75a195250a24f`
   - ❌ If it's different → Update it!

---

## ✅ Most Common Fixes

### Fix 1: Browser Cache (Most Common!)

**If console shows old key (`ux_a70c491...`):**

1. **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Or clear cache:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"
3. **Or use incognito mode:**
   - `Ctrl + Shift + N` (Windows) or `Cmd + Shift + N` (Mac)
   - Visit your portfolio

### Fix 2: HTML File Has Wrong Key

**If GitHub shows different key:**

1. **Edit `index.html`** in GitHub
2. **Find:** `key: 'ux_a70c491fc4b948514e0f2e8c5ba9e20f',`
3. **Replace with:** `key: 'ux_f5cd75623e2442f2cce75a195250a24f',`
4. **Commit and push**
5. **Wait for Vercel to deploy**
6. **Hard refresh browser**

### Fix 3: Backend Using Wrong Database

**If backend logs show `isOldProject: true`:**

1. **Go to Vercel** → Backend project → **Settings** → **Environment Variables**
2. **Check `SUPABASE_URL`:**
   - ✅ Should be: `https://kkgdxfencpyabcmizytn.supabase.co`
   - ❌ If it's: `https://xrvmiyrsxwrruhdljkoz.supabase.co` → Update it!
3. **Redeploy backend** after updating

---

## 📋 Quick Debug Checklist

- [ ] Expand "UXCam SDK Config: Object" - what key shows?
- [ ] Check Network tab - what `sdk_key` in request payload?
- [ ] Check backend logs - what SDK key being validated?
- [ ] Check Supabase - does SDK key exist?
- [ ] Check GitHub - what SDK key in `index.html`?
- [ ] Hard refresh browser - `Ctrl + Shift + R`
- [ ] Check backend environment variables in Vercel

---

## 🚨 What to Share

After checking all the above, share:
1. **Console:** What key shows when you expand "Object"?
2. **Network:** What `sdk_key` in the request payload?
3. **Backend logs:** What SDK key is being validated?
4. **Supabase:** Does `ux_f5cd75623e2442f2cce75a195250a24f` exist?

Then we can fix the exact issue! 🔍

---

## 💡 Most Likely Issue

**90% chance it's browser cache!**

The HTML file is updated, but your browser is still using the cached version with the old SDK key.

**Solution:** Hard refresh (`Ctrl + Shift + R`) or clear cache completely!
