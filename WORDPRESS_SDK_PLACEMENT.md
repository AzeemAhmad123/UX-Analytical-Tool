# ✅ WordPress SDK Placement Guide

## 🚨 Important: For WordPress Sites

Based on your file structure (I can see `wp-admin`, `wp-content`, `wp-includes`), you have a **WordPress website**.

---

## ❌ Current Location (May Not Work)

You're currently editing: `public_html/index.php`

**Problem:** The root `index.php` in WordPress is just a bootstrap file. It doesn't output HTML directly, so your SDK code might not appear on all pages.

---

## ✅ Correct Location for WordPress

### Option 1: Theme Header File (Recommended)

1. **Navigate to your active theme:**
   - Go to: `public_html/wp-content/themes/[your-theme-name]/`
   - Find `header.php`

2. **Edit `header.php`:**
   - Open the file
   - Find the `</head>` tag (usually near the end of the file)
   - **Paste SDK code BEFORE `</head>`**
   - Save

**Path example:**
```
public_html/wp-content/themes/twentytwentyfour/header.php
```

---

### Option 2: WordPress Admin (Easier Method)

1. **Log into WordPress Admin:**
   - Go to: `https://kokopandas.com/wp-admin`
   - Login with your credentials

2. **Go to Theme Editor:**
   - **Appearance** → **Theme Editor**
   - Select **Header (header.php)** from the right sidebar
   - Find `</head>` tag
   - Paste SDK code before `</head>`
   - Click **Update File**

---

### Option 3: Using a Plugin (Safest - Recommended)

1. **Install Plugin:**
   - Go to **Plugins** → **Add New**
   - Search for: **"Insert Headers and Footers"**
   - Install and activate

2. **Add SDK Code:**
   - Go to **Settings** → **Insert Headers and Footers**
   - Paste SDK code in **"Scripts in Header"** section
   - Click **Save**

**Why this is better:**
- ✅ Won't be lost when theme updates
- ✅ Easy to remove later
- ✅ Works on all pages automatically

---

## 🔍 How to Verify Current Location

### Check 1: Is code in `<head>` section?

Look at your `index.php` file:
- [ ] Do you see `<head>` tag before the SDK code?
- [ ] Do you see `</head>` tag after the SDK code?
- [ ] Is SDK code between `<head>` and `</head>`?

**If NO to any:** The code is in the wrong place!

---

### Check 2: Will it load on all pages?

For WordPress:
- Root `index.php` = Bootstrap file (doesn't output HTML)
- Theme `header.php` = Actual HTML output (correct location)

**Test:**
1. Visit your homepage: `https://kokopandas.com`
2. Press `F12` → **Console** tab
3. Look for: `UXCam SDK Config: {...}`
4. If you DON'T see it → Code is in wrong file

---

## 📝 Quick Fix Steps

### If you want to keep it in root `index.php`:

1. **Check if file has HTML structure:**
   - Look for `<!DOCTYPE html>`
   - Look for `<html>` tag
   - Look for `<head>` tag

2. **If it has HTML:**
   - Make sure SDK code is inside `<head>` section
   - Should be before `</head>` tag

3. **If it doesn't have HTML:**
   - This is WordPress bootstrap file
   - **Move code to theme's `header.php` instead**

---

## ✅ Recommended Solution

**For WordPress, use Option 3 (Plugin):**

1. Install **"Insert Headers and Footers"** plugin
2. Add SDK code in plugin settings
3. This ensures it works on ALL pages
4. Won't be lost during theme updates

---

## 🧪 Test After Moving

1. **Clear browser cache:** `Ctrl + Shift + Delete`
2. **Visit your website:** `https://kokopandas.com`
3. **Open Console:** `F12` → Console tab
4. **Look for:** `UXCam SDK Config: {...}`
5. **If you see it:** ✅ Success!
6. **If you don't:** Check Network tab for SDK file loading

---

## 🎯 Summary

| Location | Works? | Recommendation |
|----------|--------|----------------|
| Root `index.php` | ❌ Maybe | Not recommended for WordPress |
| Theme `header.php` | ✅ Yes | Good option |
| Plugin (Insert Headers) | ✅✅ Yes | **Best option** |

---

**Next Step:** Move the SDK code to your theme's `header.php` or use the plugin method!
