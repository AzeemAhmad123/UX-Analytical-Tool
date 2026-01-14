# Deployment Checklist

Use this checklist to ensure everything is ready for production deployment.

## Pre-Deployment

### Backend (Railway)

- [ ] **Environment Variables Set:**
  - [ ] `SUPABASE_URL` - Your Supabase project URL
  - [ ] `SUPABASE_SERVICE_KEY` - Service role key (from Supabase Dashboard)
  - [ ] `PORT` - Set to 3001 (or Railway will auto-assign)
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGINS` - Your frontend Vercel URL(s)

- [ ] **Database Setup:**
  - [ ] Run `backend/database/schema.sql` in Supabase SQL Editor
  - [ ] Run `backend/database/rls_policies.sql` for security
  - [ ] Verify all tables are created

- [ ] **Build Configuration:**
  - [ ] `railway.json` is configured
  - [ ] `nixpacks.toml` is configured
  - [ ] `Procfile` exists
  - [ ] `package.json` has correct build/start scripts

### Frontend (Vercel)

- [ ] **Environment Variables Set:**
  - [ ] `VITE_SUPABASE_URL` - Your Supabase project URL
  - [ ] `VITE_SUPABASE_ANON_KEY` - Anon/public key (from Supabase Dashboard)
  - [ ] `VITE_API_URL` - Your Railway backend URL
  - [ ] `VITE_ENV=production`

- [ ] **Build Configuration:**
  - [ ] `vercel.json` is configured
  - [ ] `vite.config.ts` is set up
  - [ ] `package.json` has correct build script

- [ ] **SDK Script:**
  - [ ] `uxcam-sdk-rrweb.js` is in `public/` directory
  - [ ] SDK will be accessible at `https://your-app.vercel.app/uxcam-sdk-rrweb.js`

## Deployment Steps

### 1. Deploy Backend to Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Create new project → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `backend`
5. Add all environment variables
6. Railway will auto-deploy
7. **Copy the deployment URL** (e.g., `https://your-app.railway.app`)

### 2. Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Import project from GitHub
3. Set root directory to `frontend`
4. Framework preset: Vite
5. Add all environment variables (including `VITE_API_URL` with Railway URL)
6. Deploy
7. **Copy the deployment URL** (e.g., `https://your-app.vercel.app`)

### 3. Update Backend CORS

1. Go back to Railway
2. Update `CORS_ORIGINS` environment variable to include your Vercel URL
3. Redeploy backend

### 4. Test Deployment

- [ ] Backend health check: `https://your-backend.railway.app/health`
- [ ] Frontend loads: `https://your-frontend.vercel.app`
- [ ] SDK script accessible: `https://your-frontend.vercel.app/uxcam-sdk-rrweb.js`
- [ ] Login/Register works
- [ ] Can create projects
- [ ] SDK integration code shows correct URLs

## Post-Deployment

### SDK Integration

When creating a project, the integration code should use:

```html
<script>
  window.UXCamSDK = {
    key: 'ux_YOUR_SDK_KEY',
    apiUrl: 'https://your-backend.railway.app' // Your Railway URL
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
<script src="https://your-frontend.vercel.app/uxcam-sdk-rrweb.js"></script>
```

### Testing

- [ ] Create a test project
- [ ] Copy SDK integration code
- [ ] Add to a test website
- [ ] Verify events are being sent
- [ ] Check sessions appear in dashboard
- [ ] Test funnel creation and analysis
- [ ] Verify session replay works

## Troubleshooting

### Backend Issues

- **Build fails**: Check Railway logs, verify `package.json` scripts
- **Database errors**: Verify Supabase credentials and schema
- **CORS errors**: Update `CORS_ORIGINS` in Railway

### Frontend Issues

- **Build fails**: Check Vercel logs, verify environment variables
- **API errors**: Verify `VITE_API_URL` points to Railway backend
- **SDK not loading**: Check that script is in `public/` and accessible

### SDK Issues

- **Events not appearing**: Check backend logs, verify SDK key
- **CORS errors**: Update backend `CORS_ORIGINS`
- **Script 404**: Verify `uxcam-sdk-rrweb.js` is in `frontend/public/`

## Production URLs Template

After deployment, update these:

- **Backend API**: `https://YOUR_APP.railway.app`
- **Frontend**: `https://YOUR_APP.vercel.app`
- **SDK Script**: `https://YOUR_APP.vercel.app/uxcam-sdk-rrweb.js`

## Security Reminders

- ✅ Never commit `.env` files
- ✅ Use environment variables for all secrets
- ✅ Keep `SUPABASE_SERVICE_KEY` secret (backend only)
- ✅ `SUPABASE_ANON_KEY` is safe for frontend (has RLS protection)
- ✅ Enable Supabase Row Level Security (RLS) policies
