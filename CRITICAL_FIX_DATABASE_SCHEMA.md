# 🚨 CRITICAL FIX: Database Schema Error

## Problem

The error message shows:
```
Failed to store snapshot: Could not find the 'is_initial_snapshot' column of 'session_snapshots' in the schema cache
```

**This means the database table is missing the `is_initial_snapshot` column!**

---

## ✅ Solution: Run Database Migration

### Option 1: Run SQL Migration (Recommended)

1. **Open Supabase Dashboard**:
   - Go to your Supabase project
   - Click on "SQL Editor"

2. **Run this SQL**:
   ```sql
   -- Add missing column
   ALTER TABLE session_snapshots 
   ADD COLUMN IF NOT EXISTS is_initial_snapshot BOOLEAN DEFAULT false;
   
   -- Create index
   CREATE INDEX IF NOT EXISTS idx_snapshots_initial 
   ON session_snapshots(session_id, is_initial_snapshot) 
   WHERE is_initial_snapshot = true;
   ```

3. **Or use the migration file**:
   - Copy contents of `backend/database/fix_schema.sql`
   - Paste into Supabase SQL Editor
   - Run it

### Option 2: Use the Test Script

1. **Run the test script**:
   ```bash
   cd backend
   npx ts-node test-database-schema.ts
   ```

2. **It will tell you what's missing and provide the SQL to fix it**

---

## 🔧 Temporary Fix Applied

I've updated the code to:
- **Try with the column first**
- **If it fails, retry without the column** (temporary workaround)
- **Log a warning** to remind you to add the column

**But you should still add the column for proper functionality!**

---

## ✅ After Running Migration

1. **Restart backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Test again**:
   - Open `test-sdk.html`
   - Interact with page
   - Check console - should see success messages

---

## 📝 Files Created

1. `backend/database/fix_schema.sql` - SQL to fix the schema
2. `backend/database/migration_add_is_initial_snapshot.sql` - Migration script
3. `backend/test-database-schema.ts` - Script to check schema

---

## ⚠️ Important

**The temporary fix allows snapshots to be stored, but:**
- You won't be able to distinguish initial snapshots from incremental ones
- Some queries might not work correctly
- **You should add the column as soon as possible!**

---

**Status**: ✅ Code updated with fallback, but **you need to run the SQL migration**!

