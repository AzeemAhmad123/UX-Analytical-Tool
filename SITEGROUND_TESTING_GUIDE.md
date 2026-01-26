# 🚀 SiteGround Testing Guide - UXCam Analytics SDK

## 📋 Overview

This guide will help you test the UXCam Analytics SDK on a website hosted on SiteGround. The SDK will track user behavior, record sessions, and send data to your backend API.

---

## ✅ Pre-Testing Checklist

Before you start testing, make sure:

- [ ] **Backend is deployed** on Vercel: `https://ux-analytical-tool-zbgu.vercel.app`
- [ ] **Frontend dashboard is deployed** on Vercel: `https://ux-analytical-tool-ochre.vercel.app` (or your current frontend URL)
- [ ] **You have a project created** in the dashboard with an SDK key
- [ ] **Project is active** (toggle is ON in the Projects page)
- [ ] **You have access** to edit your SiteGround website files

---

## 🔑 Step 1: Get Your SDK Integration Code

1. **Log into your dashboard:**
   - Go to: `https://ux-analytical-tool-ochre.vercel.app` (or your frontend URL)
   - Sign in with your credentials

2. **Navigate to Projects:**
   - Click on **"Projects"** in the sidebar
   - Find your project (or create a new one if needed)

3. **Get the SDK code:**
   - Click the **"Code"** icon (or expand the project card)
   - You'll see the integration code like this:

```html
<!-- Load rrweb for visual session replay -->
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>

<!-- UXCam SDK Configuration -->
<script>
  window.UXCamSDK = {
    key: 'ux_YOUR_SDK_KEY_HERE',
    apiUrl: 'https://ux-analytical-tool-zbgu.vercel.app',
    debug: true  // Enable for testing
  };
  console.log('UXCam SDK Config:', window.UXCamSDK);
</script>

<!-- Load UXCam SDK -->
<script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js?v=2.1.0" async></script>
```

4. **Copy the code** (click the copy button)

---

## 📝 Step 2: Install SDK on SiteGround Website

### Option A: HTML/PHP Website (Most Common)

1. **Access your SiteGround files:**
   - Log into **SiteGround Site Tools**
   - Go to **Files** → **File Manager**
   - Navigate to your website's root directory (usually `public_html`)

2. **Find your main HTML file:**
   - Look for `index.html`, `index.php`, or `header.php`
   - If using WordPress, look for `header.php` in your theme folder

3. **Edit the file:**
   - Right-click the file → **Edit**
   - Find the `<head>` section (usually near the top)
   - **Paste the SDK code** just before the closing `</head>` tag

4. **Save the file**

### Option B: WordPress Website

1. **Go to WordPress Admin:**
   - Log into your WordPress dashboard

2. **Edit Theme Header:**
   - Go to **Appearance** → **Theme Editor**
   - Select **Header (header.php)**
   - Find `</head>` tag
   - **Paste SDK code** before `</head>`
   - Click **Update File**

**OR use a plugin:**
- Install **"Insert Headers and Footers"** plugin
- Go to **Settings** → **Insert Headers and Footers**
- Paste SDK code in **"Scripts in Header"** section
- Save

### Option C: cPanel File Manager

1. **Log into cPanel**
2. **Open File Manager**
3. **Navigate to:** `public_html` (or your website root)
4. **Find:** `index.html` or `index.php`
5. **Edit** → Paste SDK code in `<head>` section
6. **Save**

---

## 🧪 Step 3: Test the Integration

### Test 1: Verify SDK Loads

1. **Visit your SiteGround website** in a browser
2. **Open Browser Console** (Press `F12` or `Right-click` → `Inspect` → `Console`)
3. **Look for these messages:**
   ```
   UXCam SDK Config: {key: "ux_...", apiUrl: "https://..."}
   UXCam SDK initialized
   ```
4. **If you see these messages** ✅ SDK is loaded correctly!

### Test 2: Check Network Requests

1. **Open Browser Console** → **Network** tab
2. **Refresh the page** (F5)
3. **Look for requests to:**
   - `/api/events/ingest` → Should return `200 OK`
   - `/api/snapshots/ingest` → Should return `200 OK`
4. **If requests are successful** ✅ SDK is sending data!

### Test 3: Verify Data in Dashboard

1. **Wait 1-2 minutes** (data may take time to process)
2. **Go to your dashboard:** `https://ux-analytical-tool-ochre.vercel.app`
3. **Navigate to your project** → **Sessions**
4. **You should see:**
   - Your session listed
   - Device information
   - Location data
   - Events tracked

---

## 🔍 Step 4: Debugging (If Issues Occur)

### Issue 1: SDK Not Loading

**Symptoms:**
- No console messages
- No network requests

**Solutions:**
1. **Check if code is in `<head>` section** (not in `<body>`)
2. **Verify SDK file URL is accessible:**
   - Open: `https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js` in browser
   - Should see JavaScript code (not 404 error)
3. **Check browser console for errors:**
   - Look for red error messages
   - Common errors: CORS, network errors, script loading errors

### Issue 2: "Invalid SDK Key" Error

**Symptoms:**
- Console shows: `Invalid SDK key`
- Network requests return `400` or `401`

**Solutions:**
1. **Verify SDK key in dashboard:**
   - Go to Projects page
   - Check the SDK key matches what's in your HTML
2. **Check project is active:**
   - Toggle should be ON (green)
3. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete`
   - Clear cached files
   - Hard refresh: `Ctrl + Shift + R`

### Issue 3: CORS Errors

**Symptoms:**
- Console shows: `CORS policy blocked`
- Network requests fail

**Solutions:**
1. **Check backend CORS settings:**
   - Backend should allow your SiteGround domain
   - Contact support if needed
2. **Verify `apiUrl` in SDK config:**
   - Should be: `https://ux-analytical-tool-zbgu.vercel.app`
   - No trailing slash

### Issue 4: No Data in Dashboard

**Symptoms:**
- SDK loads successfully
- Network requests return 200 OK
- But no data in dashboard

**Solutions:**
1. **Wait a few minutes** (data processing delay)
2. **Check project is active** (toggle ON)
3. **Verify backend is running:**
   - Visit: `https://ux-analytical-tool-zbgu.vercel.app/api/health`
   - Should return success message
4. **Check backend logs in Vercel:**
   - Go to Vercel dashboard
   - Check logs for errors

---

## 📊 Step 5: Verify Full Functionality

### Test Session Replay:

1. **Visit your SiteGround website**
2. **Interact with the page:**
   - Click buttons
   - Scroll the page
   - Fill out forms (if any)
   - Navigate between pages
3. **Wait 2-3 minutes**
4. **Go to dashboard** → **Sessions**
5. **Click on your session**
6. **Click "Replay Session"**
7. **You should see:**
   - Visual replay of your interactions
   - Timeline of events
   - Device/location info

### Test Events Tracking:

1. **Open browser console** on your SiteGround website
2. **Run this test code:**
   ```javascript
   if (window.UXCamSDK && window.UXCamSDK.trackEvent) {
     window.UXCamSDK.trackEvent('test_event', {
       test_data: 'SiteGround test',
       timestamp: new Date().toISOString()
     });
     console.log('✅ Test event sent!');
   } else {
     console.error('❌ SDK not loaded');
   }
   ```
3. **Check dashboard** → **Events** tab
4. **You should see** the `test_event` listed

---

## 🎯 Quick Testing Checklist

Use this checklist to verify everything works:

- [ ] SDK code pasted in `<head>` section
- [ ] Browser console shows "UXCam SDK initialized"
- [ ] Network tab shows requests to `/api/events/ingest` (200 OK)
- [ ] Network tab shows requests to `/api/snapshots/ingest` (200 OK)
- [ ] Dashboard shows new session after 2-3 minutes
- [ ] Session replay works (can see visual replay)
- [ ] Events are tracked (clicks, scrolls, page views)
- [ ] Device information is captured
- [ ] Location data is shown (country, city)

---

## 🔧 Configuration Options

You can customize the SDK behavior by modifying the config:

```javascript
window.UXCamSDK = {
  key: 'ux_YOUR_SDK_KEY',
  apiUrl: 'https://ux-analytical-tool-zbgu.vercel.app',
  debug: true,              // Enable console logs (set to false in production)
  batchSize: 10,            // Events per batch (default: 10)
  flushInterval: 5000,      // Send interval in ms (default: 5000ms = 5 seconds)
  sessionTimeout: 1800000   // Session timeout in ms (default: 30 minutes)
};
```

---

## 📱 Testing on Mobile

1. **Visit your SiteGround website on mobile** (or use browser dev tools mobile view)
2. **Interact with the page**
3. **Check dashboard** → Should show mobile device info
4. **Session replay** should work on mobile too

---

## 🚨 Common SiteGround-Specific Issues

### Issue: File Permissions

**Solution:**
- Make sure files have correct permissions (644 for files, 755 for directories)
- Check in SiteGround File Manager → Right-click file → Permissions

### Issue: PHP Version Conflicts

**Solution:**
- If using PHP, make sure version is 7.4 or higher
- Check in SiteGround → PHP Settings

### Issue: Cache Interference

**Solution:**
- Clear SiteGround cache (if using caching plugin)
- Clear browser cache
- Use incognito mode for testing

---

## 📞 Support & Troubleshooting

### If SDK Still Doesn't Work:

1. **Check browser console** for specific error messages
2. **Check network tab** for failed requests
3. **Verify backend is accessible:**
   - Visit: `https://ux-analytical-tool-zbgu.vercel.app/api/health`
4. **Check Vercel backend logs** for errors
5. **Verify SDK key** in dashboard matches HTML

### Debug Mode:

Enable debug mode to see detailed logs:

```javascript
window.UXCamSDK = {
  key: 'ux_YOUR_SDK_KEY',
  apiUrl: 'https://ux-analytical-tool-zbgu.vercel.app',
  debug: true  // This will show detailed console logs
};
```

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Browser console shows SDK initialization messages
2. ✅ Network tab shows successful API requests (200 OK)
3. ✅ Dashboard shows new sessions within 2-3 minutes
4. ✅ Session replay works and shows your interactions
5. ✅ Events are tracked (clicks, scrolls, page views)
6. ✅ Device and location data is captured

---

## 🎉 Next Steps

Once testing is successful:

1. **Disable debug mode** (set `debug: false`) for production
2. **Monitor dashboard** for incoming sessions
3. **Set up funnels** to track conversion paths
4. **Create alerts** for important events
5. **Explore analytics** features

---

## 📝 Important URLs

- **Frontend Dashboard:** `https://ux-analytical-tool-ochre.vercel.app`
- **Backend API:** `https://ux-analytical-tool-zbgu.vercel.app`
- **SDK File:** `https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js`
- **Backend Health Check:** `https://ux-analytical-tool-zbgu.vercel.app/api/health`

---

**Ready to test! Follow the steps above and let me know if you encounter any issues.** 🚀
