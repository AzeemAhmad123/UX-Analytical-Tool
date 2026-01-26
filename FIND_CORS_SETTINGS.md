# How to Find CORS Settings in Supabase

## Step-by-Step Instructions

### Method 1: Via API Keys Section

1. **In your Supabase Dashboard**, you're currently in **Settings**
2. Under **"PROJECT SETTINGS"**, click **"API Keys"** (not "API" - it's called "API Keys")
3. Scroll down on that page
4. Look for a section called **"Allowed CORS Origins"** or **"CORS Origins"**
5. You'll see a text area or input field where you can add URLs

### Method 2: Direct URL

If you can't find it, try going directly to:
```
https://supabase.com/dashboard/project/kkgdxfencpyabcmizytn/settings/api
```

Replace `kkgdxfencpyabcmizytn` with your actual project reference.

---

## What to Add in CORS Origins

Add these URLs (one per line or comma-separated):

```
https://ux-analytical-tool-ochre.vercel.app
https://ux-analytical-tool-zace.vercel.app
https://ux-analytical-tool-gzsn.vercel.app
http://localhost:5173
http://localhost:3000
```

---

## Alternative: If CORS Settings Not Visible

Some Supabase projects might have CORS settings in a different location:

1. **Settings** → **API** → Scroll to bottom
2. **Settings** → **General** → Look for "CORS" section
3. **Settings** → **Authentication** → Look for "Site URL" or "Redirect URLs"

### If Still Can't Find It:

The CORS settings might be automatically configured based on your **"Site URL"** in Authentication settings:

1. Go to **Settings** → **Authentication**
2. Find **"Site URL"** field
3. Add your frontend URL there: `https://ux-analytical-tool-ochre.vercel.app`
4. In **"Redirect URLs"**, add:
   ```
   https://ux-analytical-tool-ochre.vercel.app/**
   https://ux-analytical-tool-zace.vercel.app/**
   https://ux-analytical-tool-gzsn.vercel.app/**
   http://localhost:5173/**
   ```

---

## Quick Visual Guide

```
Settings
  └── PROJECT SETTINGS
      ├── General
      ├── Compute and Disk
      ├── Infrastructure
      ├── Integrations
      ├── Data API
      ├── API Keys  ← CLICK HERE
      │   └── Scroll down to find "Allowed CORS Origins"
      ├── JWT Keys
      └── ...
```

---

## Still Having Issues?

If you can't find CORS settings:
1. Take a screenshot of the API Keys page
2. Or check if your Supabase project version has CORS settings elsewhere
3. The authentication redirect URLs might be sufficient for your use case
