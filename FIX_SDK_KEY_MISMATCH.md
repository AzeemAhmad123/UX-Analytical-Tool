# Fix: SDK Key Mismatch After Creating New Project

## 🔍 The Problem

You created a new project, but your portfolio website is still using the **OLD SDK key**:

- **Portfolio uses:** `ux_a70c491fc4b948514e0f2e8c5ba9e20f` ❌
- **Dashboard shows:** `ux_f5cd75623e2442f2cce75a195250a24f` ✅

These don't match! That's why you're getting "Invalid SDK key" errors.

---

## ✅ Solution: Use the SDK Key from Your Dashboard

### Step 1: Copy the SDK Key from Dashboard

1. Go to your dashboard: `https://ux-analytical-tool-ochre.vercel.app/dashboard/projects`
2. Find the **SDK Key** field (it shows: `ux_f5cd75623e2442f2cce75a195250a24f`)
3. **Copy this key**

### Step 2: Update Your Portfolio Website

1. Go to your **Portfolio GitHub repository**
2. Edit `index.html`
3. Find this line (around line 20):
   ```html
   key: 'ux_a70c491fc4b948514e0f2e8c5ba9e20f',
   ```
4. **Replace it with the NEW SDK key from your dashboard:**
   ```html
   key: 'ux_f5cd75623e2442f2cce75a195250a24f',
   ```
5. **Save the file**
6. **Commit and push** to GitHub:
   ```bash
   git add index.html
   git commit -m "Update SDK key to match new project"
   git push origin main
   ```
7. **Wait for Vercel to auto-deploy** (1-2 minutes)

### Step 3: Test

1. Visit your portfolio: `https://portfolio-gamma-lake-28.vercel.app`
2. Open browser console (F12)
3. **Check for errors:**
   - ✅ Should see: `POST .../api/snapshots/ingest 200 (OK)` (not 401!)
   - ✅ Should see: `UXCam SDK: Type 2 snapshot captured`
   - ❌ Should NOT see: "Invalid SDK key"

---

## 🔍 Verify SDK Key Exists in Database

If you want to double-check, run this in Supabase SQL Editor:

```sql
SELECT 
  id,
  name,
  sdk_key,
  is_active,
  created_at
FROM projects
WHERE sdk_key = 'ux_f5cd75623e2442f2cce75a195250a24f';
```

**If it returns a row**, the SDK key exists and should work!

---

## 📋 Quick Checklist

- [ ] Copy SDK key from dashboard: `ux_f5cd75623e2442f2cce75a195250a24f`
- [ ] Update `index.html` in portfolio repo
- [ ] Change `key: 'ux_a70c491fc4b948514e0f2e8c5ba9e20f'` to `key: 'ux_f5cd75623e2442f2cce75a195250a24f'`
- [ ] Save, commit, and push to GitHub
- [ ] Wait for Vercel deployment
- [ ] Test portfolio - errors should be gone!

---

## 💡 Why This Happened

When you created a new project:
- ✅ A **new SDK key** was generated: `ux_f5cd75623e2442f2cce75a195250a24f`
- ❌ Your portfolio website still has the **old SDK key**: `ux_a70c491fc4b948514e0f2e8c5ba9e20f`
- ✅ Solution: Update portfolio to use the new SDK key

---

## 🚨 Important

**Always use the SDK key shown in your dashboard!** That's the one that exists in your current database.

---

## Summary

**Problem:** Portfolio using old SDK key, dashboard shows new SDK key  
**Solution:** Update portfolio `index.html` with the SDK key from your dashboard  
**New SDK Key:** `ux_f5cd75623e2442f2cce75a195250a24f`

Update your portfolio and the errors will be fixed! 🎉
