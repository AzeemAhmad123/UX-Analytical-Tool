# Fix: "Invalid SDK key" After Supabase Migration

## 🔍 The Problem

After migrating to a new Supabase project, **all your old projects and SDK keys are gone**. The SDK key you're using (`ux_a70c491fc4b948514e0f2e8c5ba9e20f`) doesn't exist in the new database.

**Error:**
```
UXCam SDK: Server error details: {error: 'Invalid SDK key', message: 'Invalid SDK key'}
POST https://ux-analytical-tool-zbgu.vercel.app/api/snapshots/ingest 401 (Unauthorized)
```

---

## ✅ Solution: Create a New Project

You need to create a **NEW project** in your dashboard to get a **NEW SDK key** for the new database.

---

## 🚀 Steps to Fix

### Step 1: Log into Your Dashboard

1. Go to your **frontend** URL: `https://ux-analytical-tool-ochre.vercel.app` (or your frontend domain)
2. **Log in** with your account
3. If you don't have an account, **create one** (it will be in the new Supabase database)

### Step 2: Create a New Project

1. In the dashboard, click **"Create Project"** or **"New Project"**
2. Fill in:
   - **Name:** (e.g., "Portfolio Website")
   - **Description:** (optional)
   - **Platform:** "Web" or "All"
3. Click **"Create"**

### Step 3: Get Your New SDK Key

1. After creating the project, you'll see the **SDK Key**
2. It will look like: `ux_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **Copy this key** - it's different from your old one!

### Step 4: Update Your Portfolio Website

1. Go to your **Portfolio GitHub repository**
2. Edit `index.html`
3. Find this line:
   ```html
   key: 'ux_a70c491fc4b948514e0f2e8c5ba9e20f',
   ```
4. Replace it with your **NEW SDK key**:
   ```html
   key: 'ux_YOUR_NEW_KEY_HERE',
   ```
5. **Save and push** to GitHub
6. Vercel will auto-deploy your portfolio

---

## 📋 Quick Checklist

- [ ] Log into dashboard at `https://ux-analytical-tool-ochre.vercel.app`
- [ ] Create a new project
- [ ] Copy the new SDK key
- [ ] Update `index.html` in your portfolio repository
- [ ] Push changes to GitHub
- [ ] Wait for Vercel to deploy
- [ ] Test your portfolio - errors should be gone!

---

## 🔍 Verify It's Working

After updating:

1. **Visit your portfolio:** `https://portfolio-gamma-lake-28.vercel.app`
2. **Open browser console** (F12)
3. **Check for errors:**
   - ✅ Should see: `UXCam SDK: Type 2 snapshot captured`
   - ✅ Should see: `POST .../api/snapshots/ingest 200 (OK)` (not 401!)
   - ❌ Should NOT see: "Invalid SDK key"

---

## 💡 Why This Happened

When you migrated to a new Supabase project:
- ✅ New database = Fresh start
- ❌ Old projects/keys = Left behind in old database
- ✅ Solution = Create new project in new database

---

## 📝 Summary

**Old SDK Key:** `ux_a70c491fc4b948514e0f2e8c5ba9e20f` (doesn't exist in new DB)  
**New SDK Key:** `ux_XXXXXXXXXXXXX` (get this from dashboard after creating new project)

**Action:** Create a new project in your dashboard, get the new SDK key, and update your portfolio website!
