# Step-by-Step: Integrate New Supabase Project

## ✅ Step 1: Get Your New Project Credentials

1. In your **new Supabase project** dashboard
2. Click **Settings** (gear icon) in left sidebar
3. Click **API** under "PROJECT SETTINGS"
4. Copy these values (you'll need them):

   - **Project URL**: `https://kkgdxfencpyabcmizytn.supabase.co` (your actual URL)
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this SECRET!)

   📝 **Write these down or keep the tab open!**

---

## ✅ Step 2: Set Up Database Schema

1. In your new Supabase project, click **SQL Editor** in left sidebar
2. Click **"New query"** button (top right)
3. Open the file: `backend/database/setup_new_supabase_project.sql`
4. **Copy the ENTIRE contents** of that file
5. **Paste it into the SQL Editor**
6. Click **"Run"** button (or press `Ctrl+Enter`)
7. Wait 10-30 seconds for it to complete
8. You should see: ✅ "Success. No rows returned"

**Verify tables were created:**
- Click **Table Editor** in left sidebar
- You should see these tables:
  - ✅ `projects`
  - ✅ `sessions`
  - ✅ `session_snapshots`
  - ✅ `events`
  - ✅ `session_videos`

---

## ✅ Step 3: Configure CORS Settings

1. Still in **Settings** → **API**
2. Scroll down to **"Allowed CORS Origins"** section
3. Click **"Add new origin"** or paste these URLs (one per line):

   ```
   https://ux-analytical-tool-ochre.vercel.app
   https://ux-analytical-tool-zace.vercel.app
   https://ux-analytical-tool-gzsn.vercel.app
   http://localhost:5173
   http://localhost:3000
   ```

4. Click **"Save"** button at the bottom

---

## ✅ Step 4: Update Vercel Environment Variables

### Frontend Project:

1. Go to https://vercel.com/dashboard
2. Select your **frontend project** (e.g., `ux-analytical-tool-ochre`)
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar
5. Find and **edit** these variables:

   - **`VITE_SUPABASE_URL`**
     - Click "Edit"
     - Change to: `https://kkgdxfencpyabcmizytn.supabase.co` (your new project URL)
     - Click "Save"

   - **`VITE_SUPABASE_ANON_KEY`**
     - Click "Edit"
     - Change to: Your new **anon public key** (from Step 1)
     - Click "Save"

### Backend Project:

1. Still in Vercel dashboard
2. Select your **backend project** (e.g., `ux-analytical-tool-gzsn`)
3. Click **Settings** → **Environment Variables**
4. Find and **edit** these variables:

   - **`SUPABASE_URL`**
     - Click "Edit"
     - Change to: `https://kkgdxfencpyabcmizytn.supabase.co` (your new project URL)
     - Click "Save"

   - **`SUPABASE_SERVICE_KEY`**
     - Click "Edit"
     - Change to: Your new **service_role key** (from Step 1)
     - ⚠️ **Keep this secret!** Never expose it in frontend code
     - Click "Save"

---

## ✅ Step 5: Redeploy Applications

### Redeploy Frontend:

1. In Vercel, go to your **frontend project**
2. Click **Deployments** tab
3. Find the latest deployment
4. Click the **three dots** (⋯) menu
5. Click **"Redeploy"**
6. Wait for deployment to complete (2-5 minutes)

### Redeploy Backend:

1. In Vercel, go to your **backend project**
2. Click **Deployments** tab
3. Find the latest deployment
4. Click the **three dots** (⋯) menu
5. Click **"Redeploy"**
6. Wait for deployment to complete (2-5 minutes)

**OR** - Push a commit to trigger auto-deploy:
```bash
git commit --allow-empty -m "Trigger redeploy with new Supabase"
git push origin main
```

---

## ✅ Step 6: Test Everything

### Test 1: Login/Registration

1. Go to your frontend: https://ux-analytical-tool-ochre.vercel.app
2. Click **"Create one"** or go to `/register`
3. Create a **new account** (old accounts won't work in new project)
4. Fill in:
   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`
5. Click **"Create Account"**
6. ✅ Should redirect to login or dashboard

### Test 2: Create Project

1. After logging in, go to **Dashboard**
2. Click **"Create Project"** or **"New Project"**
3. Fill in:
   - Name: `Test Project`
   - Description: `Testing new Supabase`
4. Click **"Create"**
5. ✅ Should create project successfully
6. ✅ Should show SDK key

### Test 3: SDK Data Capture

1. Copy the SDK integration code from your project
2. Create a test HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>SDK Test</title>
   </head>
   <body>
       <h1>Testing SDK</h1>
       <button onclick="alert('Clicked!')">Click Me</button>
       
       <!-- Paste your SDK script here -->
       <script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js?v=2.1.0"></script>
       <script>
           window.UXCamSDK.init({
               sdkKey: 'YOUR_SDK_KEY_HERE',
               apiUrl: 'https://ux-analytical-tool-gzsn.vercel.app',
               debug: true
           });
       </script>
   </body>
   </html>
   ```
3. Open the HTML file in browser
4. Interact with the page (click, scroll, type)
5. Wait 30 seconds
6. Go back to your dashboard
7. ✅ Should see a new session appear

---

## ⚠️ Important Notes

### What Won't Work:
- ❌ **Old user accounts** - Users need to create new accounts
- ❌ **Old projects** - Need to create new projects
- ❌ **Old SDK keys** - Need to generate new SDK keys
- ❌ **Old session data** - Historical data is in old project

### What Will Work:
- ✅ **New accounts** - Can register and login
- ✅ **New projects** - Can create projects
- ✅ **New SDK keys** - Will work with new project
- ✅ **New sessions** - Will be recorded in new project
- ✅ **Full Disk IO budget** - Fresh start!

---

## 🐛 Troubleshooting

### Issue: "Invalid SDK key" error
- **Fix**: Make sure you updated `SUPABASE_SERVICE_KEY` in backend environment variables
- **Fix**: Redeploy backend after updating environment variables

### Issue: CORS errors
- **Fix**: Double-check CORS origins in Supabase Settings → API
- **Fix**: Make sure you added all your Vercel URLs

### Issue: Login timeout
- **Fix**: Check if new Supabase project is healthy (Dashboard → Project Status)
- **Fix**: Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in frontend

### Issue: Tables not found
- **Fix**: Make sure you ran `setup_new_supabase_project.sql` completely
- **Fix**: Check SQL Editor for any errors

### Issue: Can't see sessions
- **Fix**: Create a new project in dashboard (old projects won't work)
- **Fix**: Generate new SDK key and use it in test page

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] Database tables created (5 tables visible in Table Editor)
- [ ] CORS origins added in Supabase
- [ ] Frontend environment variables updated in Vercel
- [ ] Backend environment variables updated in Vercel
- [ ] Frontend redeployed successfully
- [ ] Backend redeployed successfully
- [ ] Can create new account
- [ ] Can login with new account
- [ ] Can create new project
- [ ] Can see SDK key
- [ ] SDK captures data (sessions appear in dashboard)

---

## 🎯 Next Steps

Once everything is working:

1. **Update local `.env` files** (for local development):
   - `frontend/.env`: Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - `backend/.env`: Update `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

2. **Inform users** (if you have any):
   - They need to create new accounts
   - Old SDK keys won't work
   - They need to generate new SDK keys

3. **Optional: Keep old project**:
   - Keep old Supabase project for historical data
   - Mark it as read-only
   - Don't use it for new data

---

## 📞 Need Help?

If you encounter any errors:
1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard → Logs)
3. Check browser console for errors
4. Verify all environment variables are correct
