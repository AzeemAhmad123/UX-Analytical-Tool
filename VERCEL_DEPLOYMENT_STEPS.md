# Step-by-Step Vercel Deployment Guide

## Prerequisites ✅

- ✅ GitHub repository: `UX-Analytical-Tool`
- ✅ All keys ready (Supabase URL, Service Key, Anon Key)
- ✅ Vercel account (sign up at vercel.com if needed)

## Step 1: Install Vercel Dependency

```bash
cd backend
npm install @vercel/node
```

## Step 2: Deploy Backend to Vercel

### 2.1 Go to Vercel Dashboard

1. Go to [https://vercel.com](https://vercel.com)
2. Sign in (or sign up with GitHub)
3. Click **"Add New"** → **"Project"**

### 2.2 Import Repository

1. Click **"Import Git Repository"**
2. Find and select: `AzeemAhmad123/UX-Analytical-Tool`
3. Click **"Import"**

### 2.3 Configure Backend Project

**Important Settings:**

- **Project Name**: `uxcam-backend` (or any name)
- **Root Directory**: `backend` ⚠️ **CRITICAL - Change this!**
  - Click "Edit" next to Root Directory
  - Type: `backend`
  - Click "Continue"

- **Framework Preset**: `Other` (or leave blank)
- **Build Command**: `npm run build`
- **Output Directory**: Leave empty
- **Install Command**: `npm ci`

### 2.4 Add Environment Variables

Click **"Environment Variables"** and add:

```
SUPABASE_URL = https://xrvmiyrsxwrruhdljkoz.supabase.co
SUPABASE_SERVICE_KEY = [Your Service Role Key from Supabase]
NODE_ENV = production
CORS_ORIGINS = https://your-frontend.vercel.app
```

**Note:** 
- Get `SUPABASE_SERVICE_KEY` from: Supabase Dashboard → Settings → API → Service Role Key
- `CORS_ORIGINS` - We'll update this after frontend deployment (see Step 4 below)

### 2.5 Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for deployment
3. **Copy your backend URL** (e.g., `https://uxcam-backend.vercel.app`)

**Save this URL!** You'll need it for frontend configuration.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create New Project

1. In Vercel dashboard, click **"Add New"** → **"Project"**
2. Import same repository: `AzeemAhmad123/UX-Analytical-Tool`
3. Click **"Import"**

### 3.2 Configure Frontend Project

**Important Settings:**

- **Project Name**: `uxcam-frontend` (or any name)
- **Root Directory**: `frontend` ⚠️ **CRITICAL - Change this!**
  - Click "Edit" next to Root Directory
  - Type: `frontend`
  - Click "Continue"

- **Framework Preset**: `Vite` (should auto-detect)
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `dist` (auto-filled)
- **Install Command**: `npm ci`

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

```
VITE_SUPABASE_URL = https://xrvmiyrsxwrruhdljkoz.supabase.co
VITE_SUPABASE_ANON_KEY = [Your Anon Key from Supabase]
VITE_API_URL = https://uxcam-backend.vercel.app
VITE_ENV = production
```

**Note:**
- Get `VITE_SUPABASE_ANON_KEY` from: Supabase Dashboard → Settings → API → Anon/Public Key
- `VITE_API_URL` - Use your backend URL from Step 2.5

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for deployment
3. **Copy your frontend URL** (e.g., `https://uxcam-frontend.vercel.app`)

**Save this URL!**

---

## Step 4: Update Backend CORS ✅

**Now that your frontend is deployed, update the CORS_ORIGINS variable:**

1. Go to your **backend project** (`uxcam-backend`) in Vercel dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Find the `CORS_ORIGINS` variable in the list
4. Click the **three dots (⋯)** menu on the right → **"Edit"**
5. Update the value from `https://your-frontend.vercel.app` to your actual frontend URL:
   - **Your frontend URL:** `https://ux-analytical-tool-zace.vercel.app`
6. Click **"Save"**
7. **Vercel will automatically redeploy** your backend with the new CORS settings
8. Wait 1-2 minutes for the redeployment to complete

**✅ Done!** Your backend will now accept requests from your frontend.

---

## Step 5: Test Deployment

### 5.1 Test Backend

Visit: `https://your-backend.vercel.app/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### 5.2 Test Frontend

Visit: `https://your-frontend.vercel.app`

You should see your landing page.

### 5.3 Test SDK

1. Go to your frontend dashboard
2. Create a project
3. Copy SDK integration code
4. Test on a website
5. Verify events are being sent

---

## Troubleshooting

### Backend Build Fails

- Check that `@vercel/node` is installed
- Verify `backend/api/index.ts` exists
- Check `backend/vercel.json` is correct
- Look at build logs in Vercel

### Backend Not Responding

- Check function logs in Vercel
- Verify environment variables are set
- Make sure `CORS_ORIGINS` includes your frontend URL

### Frontend Build Fails

- Check that all environment variables are set
- Verify `VITE_API_URL` is correct
- Look at build logs in Vercel

### CORS Errors

- Update `CORS_ORIGINS` in backend
- Redeploy backend after updating
- Make sure frontend URL is correct (no trailing slash)

### SDK Not Loading

- Check that `uxcam-sdk-rrweb.js` is accessible
- Verify `VITE_API_URL` in frontend matches backend URL
- Check browser console for errors

---

## Your Deployment URLs

After deployment, you'll have:

- **Backend**: `https://uxcam-backend.vercel.app`
- **Frontend**: `https://uxcam-frontend.vercel.app`
- **SDK Script**: `https://uxcam-frontend.vercel.app/uxcam-sdk-rrweb.js`

---

## Next Steps

1. ✅ Test all endpoints
2. ✅ Create a test project
3. ✅ Test SDK integration
4. ✅ Monitor logs in Vercel dashboard
5. ✅ Set up custom domains (optional)

**You're all set!** 🚀
