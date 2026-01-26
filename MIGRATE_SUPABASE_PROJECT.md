# Guide: Migrating to a New Supabase Project

## Why Migrate?
- Your current project has exhausted its Disk IO budget
- Creating a new project gives you a fresh start with full resources
- Free tier projects have limited Disk IO capacity

## Step 1: Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"** button
3. Fill in details:
   - **Name**: `uxcam-project-v2` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., "Northeast Asia (Seoul)" or "US East")
   - **Pricing Plan**: Select **FREE** (or Pro if you want better performance)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

## Step 2: Get New Project Credentials

1. In your new project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

## Step 3: Set Up Database Schema in New Project

1. Go to **SQL Editor** in your new project
2. Click **"New query"**
3. Copy the ENTIRE contents of `backend/database/setup_new_supabase_project.sql`
4. Paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for it to complete (should take 10-30 seconds)
7. Verify tables were created:
   - Go to **Table Editor** in left sidebar
   - You should see: `projects`, `sessions`, `session_snapshots`, `events`, `session_videos`

## Step 4: Update Environment Variables

### Frontend Environment Variables (Vercel)

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your **frontend project**
3. Go to **Settings** → **Environment Variables**
4. Update these variables:
   ```
   VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_new_anon_key
   ```
5. Click **Save**

### Backend Environment Variables (Vercel)

1. Select your **backend project** in Vercel
2. Go to **Settings** → **Environment Variables**
3. Update these variables:
   ```
   SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=your_new_service_role_key
   ```
4. Click **Save**

### Local Development (.env files)

Update these files:
- `frontend/.env`
- `backend/.env`

## Step 5: Add CORS Settings in New Project

1. In new Supabase project, go to **Settings** → **API**
2. Add CORS origins:
   ```
   https://ux-analytical-tool-ochre.vercel.app
   https://ux-analytical-tool-zace.vercel.app
   https://ux-analytical-tool-gzsn.vercel.app
   http://localhost:5173
   http://localhost:3000
   ```
3. Click **Save**

## Step 6: Run Performance Indexes

1. Go to **SQL Editor** in new project
2. Run indexes from `backend/database/performance_indexes_quick.sql` (one at a time)

## Step 7: Redeploy Applications

1. **Redeploy Frontend**:
   - Go to Vercel → Frontend project
   - Click **"Redeploy"** (or push a commit to trigger redeploy)

2. **Redeploy Backend**:
   - Go to Vercel → Backend project
   - Click **"Redeploy"**

## Step 8: Test Everything

1. Test login with existing account (you'll need to create a new account in new project)
2. Test creating a project
3. Test SDK data capture
4. Verify sessions are being recorded

## ⚠️ Important Notes

### Data Migration
- **Old data will NOT be automatically migrated**
- If you need old data:
  - Export from old project (SQL dump)
  - Import to new project
  - OR keep old project for historical data

### User Accounts
- Users will need to **create new accounts** in the new project
- Old accounts won't work (different Supabase project)

### SDK Keys
- All existing SDK keys will be invalid
- Users will need to generate new SDK keys from new projects

## Alternative: Keep Both Projects

You can run both projects simultaneously:
- **Old project**: Keep for historical data (read-only)
- **New project**: Use for new data going forward

This requires updating your backend to handle both projects.

---

## Option 2: Optimize Current Project (Reduce Disk IO)

If you want to keep your current project and reduce Disk IO usage:

### Clean Up Old Data

1. **Delete old sessions** (older than 30 days):
   ```sql
   DELETE FROM sessions 
   WHERE created_at < NOW() - INTERVAL '30 days';
   ```

2. **Delete sessions without snapshots** (incomplete recordings):
   ```sql
   DELETE FROM sessions 
   WHERE id NOT IN (SELECT DISTINCT session_id FROM session_snapshots);
   ```

3. **Delete old snapshots** (keep only last 30 days):
   ```sql
   DELETE FROM session_snapshots 
   WHERE created_at < NOW() - INTERVAL '30 days';
   ```

### Optimize Queries

1. Run performance indexes (already done if you ran `performance_indexes_quick.sql`)
2. Add data retention policy (auto-delete old data)

### Upgrade Compute Add-on

1. Go to **Settings** → **Infrastructure**
2. Click **"Upgrade compute"** or **"Change compute"**
3. Upgrade from **NANO** to **MICRO** or higher
4. This costs money but gives more Disk IO budget

**Note**: Free tier has very limited Disk IO. For production use, consider upgrading to Pro plan ($25/month) which includes better compute options.
