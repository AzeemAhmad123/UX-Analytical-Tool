# ✅ SiteGround Testing Checklist

Use this checklist to systematically test the UXCam SDK on your SiteGround-hosted website.

---

## 📋 Pre-Testing Setup

- [ ] Backend is deployed and accessible
- [ ] Frontend dashboard is deployed and accessible
- [ ] Project created in dashboard
- [ ] SDK key generated for the project
- [ ] Project is set to "Active" (toggle ON)
- [ ] Have access to SiteGround file manager/editor

---

## 🔧 Installation Steps

- [ ] Logged into dashboard: `https://ux-analytical-tool-ochre.vercel.app`
- [ ] Navigated to Projects page
- [ ] Copied SDK integration code
- [ ] Accessed SiteGround file manager
- [ ] Located main HTML/PHP file (`index.html`, `index.php`, or `header.php`)
- [ ] Pasted SDK code in `<head>` section (before `</head>`)
- [ ] Saved the file
- [ ] Verified file was saved correctly

---

## 🧪 Browser Console Tests

### Test 1: SDK Initialization
- [ ] Open website in browser
- [ ] Press `F12` to open Developer Tools
- [ ] Go to **Console** tab
- [ ] Look for: `UXCam SDK Config: {key: "...", apiUrl: "..."}`
- [ ] Look for: `UXCam SDK initialized`
- [ ] **Result:** ✅ Pass / ❌ Fail

**If Fail:**
- Check if SDK code is in `<head>` section
- Verify SDK file URL is accessible
- Check for JavaScript errors in console

---

### Test 2: Network Requests
- [ ] Go to **Network** tab in Developer Tools
- [ ] Refresh the page (`F5`)
- [ ] Filter by "ingest" or look for API requests
- [ ] Check for: `POST /api/events/ingest`
  - [ ] Status: `200 OK` ✅
  - [ ] Request payload contains `sdk_key`
  - [ ] Response is successful
- [ ] Check for: `POST /api/snapshots/ingest`
  - [ ] Status: `200 OK` ✅
  - [ ] Request payload contains snapshot data
- [ ] **Result:** ✅ Pass / ❌ Fail

**If Fail:**
- Check backend URL in SDK config
- Verify backend is accessible
- Check for CORS errors
- Verify SDK key is correct

---

### Test 3: SDK Configuration
- [ ] In Console, type: `window.UXCamSDK`
- [ ] Press Enter
- [ ] Verify object shows:
  - [ ] `key`: Your SDK key (starts with `ux_`)
  - [ ] `apiUrl`: Backend URL
  - [ ] `debug`: true/false
- [ ] **Result:** ✅ Pass / ❌ Fail

---

## 📊 Dashboard Verification

### Test 4: Session Creation
- [ ] Wait 2-3 minutes after visiting website
- [ ] Go to dashboard: `https://ux-analytical-tool-ochre.vercel.app`
- [ ] Navigate to your project
- [ ] Go to **Sessions** tab
- [ ] Check if new session appears:
  - [ ] Session ID is shown
  - [ ] Timestamp is correct
  - [ ] Device info is displayed
  - [ ] Location data is shown
- [ ] **Result:** ✅ Pass / ❌ Fail

**If Fail:**
- Wait a few more minutes (data processing delay)
- Check if project is active
- Verify backend is receiving requests (check Vercel logs)
- Check backend logs for errors

---

### Test 5: Session Replay
- [ ] Click on a session in the dashboard
- [ ] Click **"Replay Session"** or **"View Replay"**
- [ ] Verify replay loads:
  - [ ] Visual replay shows your interactions
  - [ ] Timeline of events is displayed
  - [ ] Can see clicks, scrolls, page views
- [ ] **Result:** ✅ Pass / ❌ Fail

**If Fail:**
- Check if snapshots are being sent (Network tab)
- Verify snapshot data in backend logs
- Check if rrweb library loaded correctly

---

### Test 6: Events Tracking
- [ ] Go to **Events** tab in dashboard
- [ ] Verify events are listed:
  - [ ] Page view events
  - [ ] Click events
  - [ ] Scroll events
  - [ ] Form interaction events (if applicable)
- [ ] **Result:** ✅ Pass / ❌ Fail

---

### Test 7: Device Information
- [ ] Open a session in dashboard
- [ ] Check device information section:
  - [ ] Browser name and version
  - [ ] Operating system
  - [ ] Device type (Desktop/Mobile/Tablet)
  - [ ] Screen resolution
  - [ ] User agent
- [ ] **Result:** ✅ Pass / ❌ Fail

---

### Test 8: Location Data
- [ ] Open a session in dashboard
- [ ] Check location information:
  - [ ] Country is displayed
  - [ ] City is displayed (if available)
  - [ ] IP address is shown (anonymized)
- [ ] **Result:** ✅ Pass / ❌ Fail

---

## 🎯 Functional Tests

### Test 9: Custom Event Tracking
- [ ] Open browser console on your website
- [ ] Run this code:
  ```javascript
  if (window.UXCamSDK && window.UXCamSDK.trackEvent) {
    window.UXCamSDK.trackEvent('siteground_test', {
      test: true,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Test event sent!');
  }
  ```
- [ ] Wait 1-2 minutes
- [ ] Go to dashboard → Events tab
- [ ] Look for `siteground_test` event
- [ ] **Result:** ✅ Pass / ❌ Fail

---

### Test 10: Multiple Page Navigation
- [ ] Visit your website
- [ ] Navigate to 2-3 different pages
- [ ] Wait 2-3 minutes
- [ ] Check dashboard → Sessions
- [ ] Verify all page views are tracked:
  - [ ] Each page view is an event
  - [ ] Session replay shows navigation
- [ ] **Result:** ✅ Pass / ❌ Fail

---

### Test 11: Form Interactions (if applicable)
- [ ] If your website has forms, fill them out
- [ ] Focus on input fields
- [ ] Type in fields
- [ ] Submit form (if applicable)
- [ ] Wait 2-3 minutes
- [ ] Check dashboard → Events
- [ ] Verify form events are tracked:
  - [ ] `form_focus` events
  - [ ] `form_change` events
  - [ ] `form_submit` events (if applicable)
- [ ] **Result:** ✅ Pass / ❌ Fail

---

## 🔍 Error Checking

### Test 12: Error Logs
- [ ] Check browser console for errors:
  - [ ] No red error messages
  - [ ] No CORS errors
  - [ ] No network errors
  - [ ] No JavaScript errors
- [ ] Check Vercel backend logs:
  - [ ] No 500 errors
  - [ ] No database errors
  - [ ] No SDK key validation errors
- [ ] **Result:** ✅ Pass / ❌ Fail

---

## 📱 Mobile Testing (Optional)

### Test 13: Mobile Device
- [ ] Visit website on mobile device (or use browser mobile view)
- [ ] Interact with the page
- [ ] Wait 2-3 minutes
- [ ] Check dashboard → Sessions
- [ ] Verify:
  - [ ] Device type shows "Mobile"
  - [ ] Mobile browser info is captured
  - [ ] Session replay works on mobile
- [ ] **Result:** ✅ Pass / ❌ Fail

---

## 🎉 Final Verification

### All Tests Passed?
- [ ] SDK loads correctly
- [ ] Network requests successful
- [ ] Sessions appear in dashboard
- [ ] Session replay works
- [ ] Events are tracked
- [ ] Device/location data captured
- [ ] No errors in console or logs

**If all tests pass:** ✅ **SiteGround integration is successful!**

---

## 🚨 Common Issues & Solutions

| Issue | Check | Solution |
|-------|-------|----------|
| SDK not loading | Code in `<head>`? | Move to `<head>` section |
| Invalid SDK key | Key matches dashboard? | Update SDK key in HTML |
| CORS errors | Backend URL correct? | Verify `apiUrl` in config |
| No data in dashboard | Project active? | Toggle project ON |
| Network errors | Backend accessible? | Check backend health endpoint |

---

## 📝 Notes

**Testing Date:** _______________

**SiteGround Domain:** _______________

**SDK Key Used:** _______________

**Backend URL:** _______________

**Issues Found:** _______________

**Resolution:** _______________

---

## ✅ Sign-Off

- [ ] All critical tests passed
- [ ] No blocking issues
- [ ] Ready for production use
- [ ] Debug mode disabled (`debug: false`)

**Tester:** _______________

**Date:** _______________

---

**Need help?** Refer to `SITEGROUND_TESTING_GUIDE.md` for detailed instructions.
