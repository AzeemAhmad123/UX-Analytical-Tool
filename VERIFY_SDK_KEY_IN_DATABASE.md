# Verify SDK Key in Database

## 🔍 Check if SDK Key Exists

The SDK key `ux_a70c491fc4b948514e0f2e8c5ba9e20f` is being rejected. Let's verify if it exists in your new Supabase database.

---

## 📋 Steps to Check

### Option 1: Check in Supabase Dashboard

1. Go to your **Supabase Dashboard**: `https://supabase.com/dashboard/project/kkgdxfencpyabcmizytn`
2. Go to **Table Editor** → **projects** table
3. Look for a row with `sdk_key = 'ux_a70c491fc4b948514e0f2e8c5ba9e20f'`
4. **If it doesn't exist**, that's why you're getting "Invalid SDK key"

### Option 2: Run SQL Query

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query:

```sql
SELECT 
  id,
  name,
  sdk_key,
  user_id,
  is_active,
  created_at
FROM projects
WHERE sdk_key = 'ux_a70c491fc4b948514e0f2e8c5ba9e20f';
```

3. **If it returns no rows**, the SDK key doesn't exist in the database

---

## ✅ Solution

### If SDK Key Doesn't Exist:

1. **Check your dashboard** - What SDK key does it show?
   - Dashboard shows: `ux_f5cd75623e2442f2cce75a195250a24f`
   - Portfolio uses: `ux_a70c491fc4b948514e0f2e8c5ba9e20f`
   - **These don't match!**

2. **Update your portfolio website:**
   - Go to your Portfolio GitHub repo
   - Edit `index.html`
   - Change the SDK key to match what's in your dashboard:
     ```html
     key: 'ux_f5cd75623e2442f2cce75a195250a24f',
     ```
   - Save and push to GitHub

3. **Or create a new project** and use that SDK key

---

## 🔍 Check Backend Logs

Check your backend logs in Vercel to see what's happening:

1. Go to Vercel → Your backend project → **Logs** tab
2. Look for: `🔍 Validating SDK key:`
3. Check if it shows:
   - `isNewProject: true` (should be true)
   - `isOldProject: false` (should be false)
   - `supabaseUrl: 'https://kkgdxfencpyabcmizytn.supabase.co'`

If it shows `isOldProject: true`, your backend is still using the old Supabase database!

---

## 📝 Summary

**Problem:** SDK key `ux_a70c491fc4b948514e0f2e8c5ba9e20f` doesn't exist in new database

**Solution:** 
- Use the SDK key from your dashboard: `ux_f5cd75623e2442f2cce75a195250a24f`
- Update your portfolio website with this key
- Or verify the key exists in Supabase first
