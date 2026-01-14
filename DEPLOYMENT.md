# Deployment Guide

This guide will help you deploy the UXCam Analytics platform to production.

## Prerequisites

- GitHub account
- Vercel account (for frontend)
- Railway account (for backend)
- Supabase project with database configured

## 1. Backend Deployment (Railway)

### Step 1: Prepare Environment Variables

Create a `.env` file in the `backend/` directory with:

```env
SUPABASE_URL=https://xrvmiyrsxwrruhdljkoz.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

**Important:** Get your `SUPABASE_SERVICE_KEY` from Supabase Dashboard → Settings → API → Service Role Key

### Step 2: Deploy to Railway

1. Go to [Railway](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Select the `backend` folder as the root directory
4. Railway will automatically detect the `railway.json` and `nixpacks.toml` configuration
5. Add environment variables in Railway dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `PORT` (optional, defaults to 3001)
   - `NODE_ENV=production`
   - `CORS_ORIGINS` (your frontend URL)
6. Railway will build and deploy automatically
7. Copy your Railway deployment URL (e.g., `https://your-app.railway.app`)

### Step 3: Update Database Schema

Run the database migrations in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Run `backend/database/schema.sql` (if not already run)
3. Run `backend/database/rls_policies.sql` for security

## 2. Frontend Deployment (Vercel)

### Step 1: Prepare Environment Variables

Create a `.env` file in the `frontend/` directory with:

```env
VITE_SUPABASE_URL=https://xrvmiyrsxwrruhdljkoz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=https://your-backend.railway.app
VITE_ENV=production
```

**Important:** 
- Get `VITE_SUPABASE_ANON_KEY` from Supabase Dashboard → Settings → API → Anon/Public Key
- Set `VITE_API_URL` to your Railway backend URL

### Step 2: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and import your GitHub repository
2. Set the root directory to `frontend`
3. Vercel will auto-detect Vite configuration
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (your Railway backend URL)
   - `VITE_ENV=production`
5. Deploy
6. Copy your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### Step 3: Update Backend CORS

After getting your Vercel URL, update the `CORS_ORIGINS` environment variable in Railway to include your Vercel domain.

## 3. SDK Configuration for Production

### For Web Projects

When creating a project in the dashboard, you'll get an SDK integration code like:

```html
<script>
  window.UXCamSDK = {
    key: 'ux_YOUR_SDK_KEY',
    apiUrl: 'https://your-backend.railway.app' // Your Railway backend URL
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
<script src="https://your-frontend.vercel.app/uxcam-sdk-rrweb.js"></script>
```

**Important:** 
- Replace `https://your-backend.railway.app` with your actual Railway backend URL
- Replace `https://your-frontend.vercel.app` with your actual Vercel frontend URL
- The SDK will auto-detect the API URL if not provided, but it's recommended to set it explicitly

## 4. Post-Deployment Checklist

- [ ] Backend is running on Railway
- [ ] Frontend is running on Vercel
- [ ] Environment variables are set correctly
- [ ] Database schema is applied
- [ ] CORS is configured correctly
- [ ] SDK script is accessible at `https://your-frontend.vercel.app/uxcam-sdk-rrweb.js`
- [ ] Test SDK integration on a test website
- [ ] Verify events are being ingested
- [ ] Test funnel creation and analysis

## 5. Troubleshooting

### SDK Not Loading
- Check that `uxcam-sdk-rrweb.js` is accessible at your Vercel URL
- Check browser console for CORS errors
- Verify `apiUrl` in SDK configuration matches your Railway backend URL

### Events Not Appearing
- Check Railway logs for errors
- Verify `SUPABASE_SERVICE_KEY` is correct
- Check that database schema is applied
- Verify SDK key matches project in database

### CORS Errors
- Update `CORS_ORIGINS` in Railway environment variables
- Include your Vercel domain in the allowed origins

## 6. Production URLs

After deployment, update these in your code:

1. **Backend API URL**: `https://your-app.railway.app`
2. **Frontend URL**: `https://your-app.vercel.app`
3. **SDK Script URL**: `https://your-app.vercel.app/uxcam-sdk-rrweb.js`

## 7. Security Notes

- Never commit `.env` files to Git
- Use environment variables for all sensitive data
- Keep `SUPABASE_SERVICE_KEY` secret (backend only)
- Use `SUPABASE_ANON_KEY` in frontend (public, but has RLS protection)
