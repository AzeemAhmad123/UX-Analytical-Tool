# Testing Guide - Phase 1 Verification

## Step 1: Create Environment File

1. Go to `backend` folder
2. Create a file named `.env` (no extension)
3. Add these lines:

```env
SUPABASE_URL=https://xrvmiyrsxwrruhdljkoz.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**To get your Supabase Service Key:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. Paste it in `.env` file

---

## Step 2: Test Server Runs

### Option A: Using Terminal (Recommended)

1. Open terminal in the `backend` folder
2. Run:
   ```bash
   npm run dev
   ```

3. **Expected Output:**
   ```
   🚀 Backend server running on http://localhost:3001
   📡 CORS enabled for: http://localhost:5173
   ```

4. **If you see errors:**
   - Check if `.env` file exists
   - Check if Supabase service key is correct
   - Check if port 3001 is already in use

### Option B: Test Health Endpoint

**While server is running**, open a new terminal and run:

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:3001/health | Select-Object -ExpandProperty Content
```

**Or use browser:**
- Open: http://localhost:3001/health
- Should see: `{"status":"ok","timestamp":"2026-01-05T..."}`

**Or use curl (if installed):**
```bash
curl http://localhost:3001/health
```

---

## Step 3: Verify Database Schema

### Method 1: Using Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire content from `backend/database/schema.sql`
6. Paste it in the SQL Editor
7. Click **Run** (or press F5)
8. You should see: `Success. No rows returned`

9. **Verify tables were created:**
   - Click **Table Editor** (left sidebar)
   - You should see 4 tables:
     - ✅ `projects`
     - ✅ `sessions`
     - ✅ `session_snapshots`
     - ✅ `events`

### Method 2: Using SQL Query

In Supabase SQL Editor, run:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'sessions', 'session_snapshots', 'events')
ORDER BY table_name;
```

**Expected Result:**
```
table_name
-----------
events
projects
session_snapshots
sessions
```

### Method 3: Check Table Structure

Run this query to see all columns:

```sql
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('projects', 'sessions', 'session_snapshots', 'events')
ORDER BY table_name, ordinal_position;
```

---

## Step 4: Test Database Connection (Optional)

Create a test file to verify Supabase connection:

1. Create `backend/test-connection.ts`:
```typescript
import { supabase } from './src/config/supabase'

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
    } else {
      console.log('✅ Database connection successful!')
    }
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

testConnection()
```

2. Run:
```bash
npx tsx test-connection.ts
```

---

## Common Issues

### Issue 1: "Cannot find module"
**Solution:** Run `npm install` in the backend folder

### Issue 2: "Port 3001 already in use"
**Solution:** 
- Change `PORT=3002` in `.env` file
- Or stop the process using port 3001

### Issue 3: "SUPABASE_SERVICE_KEY not set"
**Solution:** 
- Check `.env` file exists
- Check service key is correct (starts with `eyJ...` or `sb_...`)

### Issue 4: "Table already exists" error
**Solution:** 
- Tables already exist, that's fine!
- Or drop tables first if you want to recreate them

---

## ✅ Success Checklist

- [ ] `.env` file created with Supabase credentials
- [ ] Server starts without errors (`npm run dev`)
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Database schema created (4 tables visible in Supabase)
- [ ] No TypeScript errors

---

## Next: Phase 2

Once all checks pass, we can proceed to Phase 2:
- SDK key validation middleware
- Session service
- Snapshot service

