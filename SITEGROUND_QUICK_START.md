# 🚀 SiteGround Quick Start - UXCam SDK

## ⚡ 5-Minute Setup

### Step 1: Get SDK Code
1. Go to dashboard: `https://ux-analytical-tool-ochre.vercel.app`
2. Projects → Click "Code" icon → Copy code

### Step 2: Paste in SiteGround
1. SiteGround → File Manager → `public_html`
2. Edit `index.html` (or `header.php` for WordPress)
3. Paste SDK code in `<head>` section (before `</head>`)
4. Save

### Step 3: Test
1. Visit your website
2. Press `F12` → Console tab
3. Look for: `UXCam SDK initialized` ✅

---

## 🔍 Quick Verification

**Browser Console Should Show:**
```
UXCam SDK Config: {key: "ux_...", apiUrl: "https://..."}
UXCam SDK initialized
```

**Network Tab Should Show:**
- `POST /api/events/ingest` → 200 OK ✅
- `POST /api/snapshots/ingest` → 200 OK ✅

**Dashboard Should Show:**
- New session within 2-3 minutes
- Device/location info
- Session replay works

---

## 🚨 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No console messages | Check code is in `<head>` section |
| "Invalid SDK key" | Verify key in dashboard matches HTML |
| CORS errors | Check `apiUrl` is correct |
| No data in dashboard | Wait 2-3 minutes, check project is active |

---

## 📋 SDK Code Template

```html
<!-- Load rrweb -->
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>

<!-- SDK Config -->
<script>
  window.UXCamSDK = {
    key: 'ux_YOUR_SDK_KEY_HERE',
    apiUrl: 'https://ux-analytical-tool-zbgu.vercel.app',
    debug: true  // Set to false in production
  };
</script>

<!-- Load SDK -->
<script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js?v=2.1.0" async></script>
```

---

## ✅ Success Checklist

- [ ] SDK code in `<head>` section
- [ ] Console shows "UXCam SDK initialized"
- [ ] Network requests return 200 OK
- [ ] Dashboard shows session after 2-3 minutes
- [ ] Session replay works

---

**Need more details?** See `SITEGROUND_TESTING_GUIDE.md` for complete guide.
