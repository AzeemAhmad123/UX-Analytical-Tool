# 📖 How to Run SQL and Clear Cache - Step by Step Guide

## Part 1: How to Run SQL in Supabase

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project: **azeemkhattak63-star's Project** (or your project name)

### Step 2: Open SQL Editor
1. In the left sidebar, click on **"SQL Editor"** (icon looks like a code bracket `</>`)
2. You'll see a SQL editor interface

### Step 3: Run the Migration SQL
1. Click **"New query"** button (or the `+` icon)
2. Copy and paste this SQL code:

```sql
-- Add project_id column to session_snapshots table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'session_snapshots' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE session_snapshots 
        ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_snapshots_project_id 
        ON session_snapshots(project_id);
        
        -- Update existing records to have project_id from their session
        UPDATE session_snapshots ss
        SET project_id = s.project_id
        FROM sessions s
        WHERE ss.session_id = s.id
        AND ss.project_id IS NULL;
        
        -- Make it NOT NULL after updating existing records
        ALTER TABLE session_snapshots 
        ALTER COLUMN project_id SET NOT NULL;
        
        RAISE NOTICE '✅ Added project_id column to session_snapshots';
    ELSE
        RAISE NOTICE '✅ Column project_id already exists in session_snapshots';
    END IF;
END $$;
```

3. Click the **"Run"** button (green button, or press `Ctrl+Enter`)
4. Wait for the query to complete
5. You should see: **"Success. No rows returned"** or **"✅ Added project_id column"**

### Step 4: Verify (Optional)
To check if the column was added, run this query:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'session_snapshots'
ORDER BY ordinal_position;
```

You should see `project_id` in the list!

---

## Part 2: How to Clear Browser Cache

### Method 1: Hard Refresh (Quick - Recommended)
This clears the cache for the current page only:

**Windows/Linux:**
- Press `Ctrl + Shift + R`
- Or press `Ctrl + F5`

**Mac:**
- Press `Cmd + Shift + R`
- Or press `Cmd + Option + R`

**What it does:**
- Reloads the page
- Clears cached JavaScript/CSS files
- Keeps your cookies and other data

---

### Method 2: Clear Cache via Developer Tools (More Thorough)

1. **Open Developer Tools:**
   - Press `F12` (Windows/Linux)
   - Or `Cmd + Option + I` (Mac)
   - Or right-click → "Inspect"

2. **Right-click the Refresh Button:**
   - Find the refresh button in your browser
   - **Right-click** it (don't just click)
   - You'll see options:
     - "Empty Cache and Hard Reload" ← **Choose this one!**
     - "Normal Reload"
     - "Hard Reload"

3. **Select "Empty Cache and Hard Reload"**
   - This clears cache and reloads the page

---

### Method 3: Clear All Cache (Most Thorough)

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"** or **"Last hour"**
4. Click **"Clear data"**

**Firefox:**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cache"**
3. Time range: **"Everything"**
4. Click **"Clear Now"**

---

### Method 4: Clear Cache for Specific Site (Chrome/Edge)

1. Click the **lock icon** (or info icon) in the address bar
2. Click **"Site settings"**
3. Click **"Clear data"**
4. Check **"Cached images and files"**
5. Click **"Clear"**

---

## 🎯 Recommended Steps for Testing

### Step 1: Run SQL Migration
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the migration SQL (see Part 1 above)
4. Verify it completed successfully

### Step 2: Clear Browser Cache
1. Open `test-sdk.html` in browser
2. Press `Ctrl + Shift + R` (hard refresh)
3. Or use Method 2 (Empty Cache and Hard Reload)

### Step 3: Restart Backend
```bash
cd backend
npm run dev
```

### Step 4: Test
1. Open `test-sdk.html`
2. Interact with the page
3. Check console for errors

---

## ✅ Verification Checklist

After running SQL and clearing cache:

- [ ] SQL migration completed successfully
- [ ] Browser cache cleared (hard refresh done)
- [ ] Backend restarted
- [ ] `test-sdk.html` opened
- [ ] Console shows no "Illegal invocation" errors
- [ ] Console shows "Type 2 snapshot captured"
- [ ] Console shows "Type 2 upload successful"
- [ ] No database errors in backend console

---

## 🆘 Troubleshooting

### SQL Error: "Column already exists"
- **This is OK!** It means the column is already there
- You can skip the SQL migration
- The code will work as-is

### Cache Not Clearing
- Try Method 3 (Clear All Cache)
- Or close and reopen the browser
- Or use Incognito/Private mode

### Still Seeing Old Errors
1. **Close the browser completely**
2. **Reopen it**
3. **Open `test-sdk.html` again**
4. **Hard refresh** (`Ctrl + Shift + R`)

---

## 📝 Quick Reference

**Run SQL:**
1. Supabase Dashboard → SQL Editor
2. Paste SQL code
3. Click "Run"

**Clear Cache:**
- Quick: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Thorough: Developer Tools → Right-click Refresh → "Empty Cache and Hard Reload"

---

**That's it! Follow these steps and you're ready to test!** 🚀

