# Supabase Fix Guide - How to Fix Unhealthy Services

## 🚨 Current Issues
- Database: Unhealthy
- PostgREST: Unhealthy  
- Auth: Unhealthy
- Storage: Unhealthy
- Resource Exhaustion Warning

## Step 1: Add CORS Settings (Fixes Login Issues)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **azeemkhattak63-star's Project**
3. Click **Settings** (gear icon in left sidebar)
4. Click **API** under "PROJECT SETTINGS"
5. Scroll down to **"Allowed CORS Origins"** section
6. Add these URLs (one per line):
   ```
   https://ux-analytical-tool-ochre.vercel.app
   https://ux-analytical-tool-zace.vercel.app
   https://ux-analytical-tool-gzsn.vercel.app
   http://localhost:5173
   http://localhost:3000
   ```
7. Click **"Save"** button at the bottom

## Step 2: Restart Services (Fixes Unhealthy Status)

1. Go to **Settings** → **Infrastructure**
2. Find the **"Primary Database"** card
3. Look for a **"Restart"** or **"Pause/Resume"** button
4. Click it to restart the database (this will restart all services)
5. Wait 2-3 minutes for services to come back online
6. Refresh the dashboard and check if services are now "Healthy"

**Alternative Method:**
- Go to **Settings** → **General**
- Scroll to bottom and click **"Restart Project"** (if available)

## Step 3: Check Resource Usage

1. Click **"Check usage"** button in the warning banner, OR
2. Go to **Settings** → **Usage**
3. Review which resources are hitting limits:
   - **Database**: Check connection count, query time
   - **Auth**: Check request count
   - **Storage**: Check file count and size
4. If you're hitting limits, consider:
   - Upgrading to Pro plan ($25/month)
   - Optimizing queries (run indexes below)
   - Reducing unnecessary requests

## Step 4: Run Performance Indexes (Improves Database Performance)

1. Go to **SQL Editor** in left sidebar
2. Click **"New query"**
3. Copy and paste **ONE index at a time** from `backend/database/performance_indexes_quick.sql`:

```sql
-- Run these ONE AT A TIME (not all at once)

-- Index 1
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- Wait for it to complete, then run Index 2
CREATE INDEX IF NOT EXISTS idx_sessions_project_session ON sessions(project_id, session_id);

-- Wait for it to complete, then run Index 3
CREATE INDEX IF NOT EXISTS idx_sessions_project_start_time ON sessions(project_id, start_time DESC);

-- Wait for it to complete, then run Index 4
CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON session_snapshots(session_id);

-- Wait for it to complete, then run Index 5
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Wait for it to complete, then run Index 6
CREATE INDEX IF NOT EXISTS idx_projects_sdk_key ON projects(sdk_key);
```

4. Click **"Run"** after each index
5. Wait for each to complete before running the next one

## Step 5: Verify Services Are Healthy

1. Go back to **Dashboard** (Home icon)
2. Check the **"Project Status"** panel on the right
3. All services should show **"Healthy"** (green checkmark)
4. If still unhealthy, wait 5-10 minutes and refresh

## Step 6: Test Login

1. Go to your frontend: https://ux-analytical-tool-ochre.vercel.app/login
2. Try logging in with an existing account
3. It should work now!

## ⚠️ If Issues Persist

### Option A: Upgrade Plan
- Go to **Settings** → **Billing**
- Upgrade from **FREE** to **PRO** ($25/month)
- This gives you:
  - More database connections
  - Better performance
  - Higher limits
  - Priority support

### Option B: Check Database Connections
1. Go to **Database** → **Connection Pooling**
2. Enable connection pooling if not already enabled
3. This reduces connection exhaustion

### Option C: Contact Supabase Support
- If services remain unhealthy after restart
- Go to **Help** → **Support** in dashboard

## 📝 Quick Checklist

- [ ] Added CORS origins in Settings → API
- [ ] Restarted services (Infrastructure or General settings)
- [ ] Waited 2-3 minutes for services to restart
- [ ] Verified services are "Healthy" in dashboard
- [ ] Ran performance indexes (one at a time)
- [ ] Tested login functionality
- [ ] Checked resource usage to ensure not hitting limits

## 🎯 Expected Result

After completing these steps:
- ✅ All services should show "Healthy"
- ✅ Login should work without timeout errors
- ✅ No more 522 Cloudflare errors
- ✅ Better database performance
