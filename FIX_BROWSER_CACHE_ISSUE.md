# Fix: Browser Cache Issue - Old SDK Key Still Loading

## 🔍 The Problem

You updated `index.html` with the new SDK key (`ux_f5cd75623e2442f2cce75a195250a24f`), but your browser is still using the **old cached version** with the old key (`ux_a70c491fc4b948514e0f2e8c5ba9e20f`).

**This is a browser cache issue!**

---

## ✅ Solution: Clear Browser Cache

### Option 1: Hard Refresh (Easiest)

1. **Visit your portfolio:** `https://portfolio-gamma-lake-28.vercel.app`
2. **Press these keys together:**
   - **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
   - **Mac:** `Cmd + Shift + R`
3. This forces the browser to reload everything from the server

### Option 2: Clear Browser Cache

1. **Open browser settings:**
   - **Chrome/Edge:** Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
   - Or go to: Settings → Privacy → Clear browsing data
2. **Select:**
   - ✅ "Cached images and files"
   - ✅ "Cookies and other site data" (optional)
3. **Time range:** "Last hour" or "All time"
4. **Click "Clear data"**
5. **Refresh the page**

### Option 3: Use Incognito/Private Mode

1. **Open an incognito/private window:**
   - **Chrome/Edge:** `Ctrl + Shift + N` (Windows) or `Cmd + Shift + N` (Mac)
2. **Visit:** `https://portfolio-gamma-lake-28.vercel.app`
3. This bypasses all cache

---

## 🔍 Verify Vercel Has Deployed

Before clearing cache, make sure Vercel has deployed your changes:

1. **Go to your Portfolio Vercel project**
2. **Check "Deployments" tab**
3. **Look for the latest deployment** with commit message "Update UXCam SDK key in index.html"
4. **Status should be:** ✅ "Ready" (green)
5. **If it's still deploying, wait for it to finish**

---

## 🧪 Test After Clearing Cache

1. **Visit your portfolio:** `https://portfolio-gamma-lake-28.vercel.app`
2. **Open browser console** (F12)
3. **Check the SDK config:**
   - Look for: `UXCam SDK Config: {key: 'ux_f5cd75623e2442f2cce75a195250a24f', ...}`
   - ✅ Should show the **NEW** key
   - ❌ Should NOT show the old key
4. **Check for errors:**
   - ✅ Should see: `POST .../api/snapshots/ingest 200 (OK)`
   - ❌ Should NOT see: "Invalid SDK key"

---

## 💡 Why This Happened

1. **You updated `index.html`** ✅
2. **You pushed to GitHub** ✅
3. **Vercel deployed** ✅
4. **But your browser cached the old version** ❌

Browsers cache files to load pages faster. Sometimes they cache too aggressively and don't check for updates.

---

## 🚀 Permanent Fix: Add Cache-Busting

If this keeps happening, you can add a cache-busting parameter to the SDK script URL in your `index.html`:

**Current:**
```html
<script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js?v=2.1.0" async></script>
```

**Update to (add timestamp):**
```html
<script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js?v=2.1.0&t=<?php echo time(); ?>" async></script>
```

Or if you don't use PHP, update the version number:
```html
<script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js?v=2.1.1" async></script>
```

---

## 📋 Quick Checklist

- [ ] Verify Vercel has deployed your changes
- [ ] Hard refresh your browser: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
- [ ] Check console for new SDK key: `ux_f5cd75623e2442f2cce75a195250a24f`
- [ ] Verify no "Invalid SDK key" errors
- [ ] If still showing old key, clear browser cache completely

---

## Summary

**Problem:** Browser is caching the old `index.html` with old SDK key  
**Solution:** Hard refresh (`Ctrl + Shift + R`) or clear browser cache  
**Why:** Browsers cache files to speed up loading, but sometimes cache too aggressively

**Try a hard refresh first - that usually fixes it!** 🎉
