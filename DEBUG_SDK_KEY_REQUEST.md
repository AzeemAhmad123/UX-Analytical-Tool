# Debug: Check What SDK Key Is Being Sent

## 🔍 The Problem

You're still getting "Invalid SDK key" errors. We need to check:
1. **What SDK key is actually being sent** to the backend
2. **What SDK key exists in the database**
3. **If they match**

---

## ✅ Step 1: Check What SDK Key Is Being Sent

### In Browser Console:

1. **Open your portfolio:** `https://portfolio-gamma-lake-28.vercel.app`
2. **Open browser console** (F12)
3. **Expand the "Object" in the console:**
   - Find: `UXCam SDK Config: Object`
   - **Click on it** to expand
   - Look for the `key` property
   - **What key does it show?**

4. **Or check the Network tab:**
   - Go to **Network** tab in console
   - Find the failed request: `POST .../api/snapshots/ingest`
   - Click on it
   - Go to **Payload** or **Request** tab
   - Look for `sdk_key` in the request body
   - **What key is being sent?**

---

## ✅ Step 2: Check Backend Logs

The backend logs what SDK key it receives. Let's check:

1. **Go to Vercel** → Your backend project (`ux-analytical-tool-zbgu`)
2. **Go to "Logs" tab**
3. **Look for:** `🔍 Validating SDK key:`
4. **Check:**
   - What `sdkKeyPrefix` is shown?
   - What `supabaseUrl` is shown?
   - Does it show `isNewProject: true`?
   - Does it show `isOldProject: false`?

5. **Also look for:** `❌ Supabase error validating SDK key:`
   - What error message is shown?
   - What `sdkKey` is shown?

---

## ✅ Step 3: Verify SDK Key in Database

1. **Go to Supabase Dashboard:** `https://supabase.com/dashboard/project/kkgdxfencpyabcmizytn`
2. **Go to Table Editor** → **projects** table
3. **Check what SDK keys exist:**
   - You should see: `ux_f5cd75623e2442f2cce75a195250a24f`
   - **Does it exist?**
   - **Is `is_active` set to `true`?**

---

## ✅ Step 4: Check Your HTML File

1. **Go to your Portfolio GitHub repo**
2. **View `index.html`** (raw file)
3. **Search for:** `key:`
4. **What SDK key is in the file?**
   - Should be: `ux_f5cd75623e2442f2cce75a195250a24f`
   - If it's different, that's the problem!

---

## 🔍 Common Issues

### Issue 1: Browser Still Caching Old HTML
**Solution:** 
- Hard refresh: `Ctrl + Shift + R`
- Or clear cache completely
- Or use incognito mode

### Issue 2: SDK Key in HTML Doesn't Match Database
**Solution:**
- Update HTML with the SDK key from your dashboard
- Make sure it matches what's in Supabase

### Issue 3: Backend Using Wrong Supabase Database
**Solution:**
- Check backend logs show `isNewProject: true`
- Check backend environment variables in Vercel

### Issue 4: SDK Key Not Active
**Solution:**
- Check `is_active` column in Supabase
- Should be `true`

---

## 📋 Quick Debug Checklist

- [ ] Expand "UXCam SDK Config: Object" in console - what key shows?
- [ ] Check Network tab - what `sdk_key` is in the request payload?
- [ ] Check backend logs - what SDK key is being validated?
- [ ] Check Supabase - does the SDK key exist in `projects` table?
- [ ] Check GitHub - what SDK key is in `index.html`?
- [ ] Hard refresh browser - `Ctrl + Shift + R`
- [ ] Check if `is_active = true` in database

---

## 🚨 Most Likely Issues

1. **Browser cache** - HTML file not updated (hard refresh needed)
2. **SDK key mismatch** - HTML has different key than database
3. **Backend using old database** - Check Vercel environment variables

---

## Next Steps

After checking all the above, share:
1. What SDK key shows in console (expand the Object)
2. What SDK key shows in Network tab (request payload)
3. What backend logs show (SDK key being validated)
4. What SDK key exists in Supabase database

Then we can fix the exact issue! 🔍
