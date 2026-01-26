# Quick Migration Checklist - New Supabase Project

## ✅ Step-by-Step Checklist

### 1. Create New Supabase Project
- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Name: `uxcam-project-v2`
- [ ] Region: Choose closest to users
- [ ] Plan: FREE (or Pro)
- [ ] Wait 2-3 minutes for setup

### 2. Get New Credentials
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL**: `https://xxxxx.supabase.co`
- [ ] Copy **anon public key**
- [ ] Copy **service_role key** (keep secret!)

### 3. Set Up Database
- [ ] Go to **SQL Editor**
- [ ] Run `backend/database/setup_new_supabase_project.sql`
- [ ] Verify tables created in **Table Editor**

### 4. Configure CORS
- [ ] Go to **Settings** → **API**
- [ ] Add CORS origins:
  ```
  https://ux-analytical-tool-ochre.vercel.app
  https://ux-analytical-tool-zace.vercel.app
  https://ux-analytical-tool-gzsn.vercel.app
  http://localhost:5173
  http://localhost:3000
  ```
- [ ] Click **Save**

### 5. Update Vercel Environment Variables

#### Frontend Project:
- [ ] Go to Vercel → Frontend project → **Settings** → **Environment Variables**
- [ ] Update `VITE_SUPABASE_URL` = `https://YOUR_NEW_PROJECT.supabase.co`
- [ ] Update `VITE_SUPABASE_ANON_KEY` = `your_new_anon_key`
- [ ] Click **Save**

#### Backend Project:
- [ ] Go to Vercel → Backend project → **Settings** → **Environment Variables**
- [ ] Update `SUPABASE_URL` = `https://YOUR_NEW_PROJECT.supabase.co`
- [ ] Update `SUPABASE_SERVICE_KEY` = `your_new_service_role_key`
- [ ] Click **Save**

### 6. Redeploy
- [ ] Redeploy Frontend (Vercel → Frontend → Deployments → Redeploy)
- [ ] Redeploy Backend (Vercel → Backend → Deployments → Redeploy)
- [ ] Wait for deployments to complete

### 7. Test
- [ ] Go to frontend: https://ux-analytical-tool-ochre.vercel.app
- [ ] Create a new account (old accounts won't work)
- [ ] Create a new project
- [ ] Test SDK data capture
- [ ] Verify sessions are recording

## ⚠️ Important Notes

- **Old data is NOT migrated** - you'll start fresh
- **Users need new accounts** - old accounts won't work
- **SDK keys are invalid** - generate new ones
- **Old project can be kept** for historical data (read-only)

## 🎯 Expected Result

After completing all steps:
- ✅ New Supabase project with full Disk IO budget
- ✅ All services healthy
- ✅ Login working
- ✅ Data capture working
- ✅ No more resource exhaustion warnings
