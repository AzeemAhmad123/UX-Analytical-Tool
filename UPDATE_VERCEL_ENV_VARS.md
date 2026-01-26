# Update Vercel Environment Variables

## Your New Supabase Credentials

**Project URL:** `https://kkgdxfencpyabcmizytn.supabase.co`

**Anon Key (Public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIxNTMsImV4cCI6MjA4NDc1ODE1M30.6zx9s2QaGVZXAZgliwH3Uvrr9IkQQ9-uvpNG6y5inV0
```

**Service Role Key (Secret - Backend Only):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjE1MywiZXhwIjoyMDg0NzU4MTUzfQ.3XXlRE8_JePIY2h_MyMWjgTLM8YPBjwJ1F0589vOXmw
```

---

## Step 1: Update Frontend Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your **frontend project** (e.g., `ux-analytical-tool-ochre`)
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar
5. Find and **edit** these variables:

### Update `VITE_SUPABASE_URL`:
- Click **"Edit"** button
- **New Value:** `https://kkgdxfencpyabcmizytn.supabase.co`
- Click **"Save"**

### Update `VITE_SUPABASE_ANON_KEY`:
- Click **"Edit"** button
- **New Value:** 
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIxNTMsImV4cCI6MjA4NDc1ODE1M30.6zx9s2QaGVZXAZgliwH3Uvrr9IkQQ9-uvpNG6y5inV0
  ```
- Click **"Save"**

---

## Step 2: Update Backend Environment Variables

1. Still in Vercel dashboard
2. Select your **backend project** (e.g., `ux-analytical-tool-gzsn`)
3. Click **Settings** → **Environment Variables**
4. Find and **edit** these variables:

### Update `SUPABASE_URL`:
- Click **"Edit"** button
- **New Value:** `https://kkgdxfencpyabcmizytn.supabase.co`
- Click **"Save"**

### Update `SUPABASE_SERVICE_KEY`:
- Click **"Edit"** button
- **New Value:**
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjE1MywiZXhwIjoyMDg0NzU4MTUzfQ.3XXlRE8_JePIY2h_MyMWjgTLM8YPBjwJ1F0589vOXmw
  ```
- ⚠️ **Keep this SECRET!** Never expose it in frontend code
- Click **"Save"**

---

## Step 3: Redeploy Both Projects

### Redeploy Frontend:
1. Go to your **frontend project** in Vercel
2. Click **Deployments** tab
3. Click **three dots** (⋯) on latest deployment
4. Click **"Redeploy"**
5. Wait 2-5 minutes

### Redeploy Backend:
1. Go to your **backend project** in Vercel
2. Click **Deployments** tab
3. Click **three dots** (⋯) on latest deployment
4. Click **"Redeploy"**
5. Wait 2-5 minutes

---

## ✅ Verification Checklist

After redeploying, verify:

- [ ] Frontend environment variables updated
- [ ] Backend environment variables updated
- [ ] Frontend redeployed successfully
- [ ] Backend redeployed successfully
- [ ] Can access frontend URL
- [ ] Can create new account
- [ ] Can login
- [ ] Can create project
- [ ] SDK captures data

---

## 🎯 Next: Set Up Database Schema

After updating Vercel, you still need to:
1. Run the database setup script in Supabase SQL Editor
2. Configure CORS settings

See `INTEGRATE_NEW_SUPABASE_STEPS.md` for complete instructions.
