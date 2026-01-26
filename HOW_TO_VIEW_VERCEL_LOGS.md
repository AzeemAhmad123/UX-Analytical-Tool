# How to View Backend Logs in Vercel

## 📍 Step-by-Step Guide

### Step 1: Go to Your Backend Project

1. Open your browser
2. Go to: https://vercel.com/dashboard
3. Click on your project: **`ux-analytical-tool-gzsn`**

---

### Step 2: Open the Latest Deployment

1. Click on the **"Deployments"** tab (at the top)
2. You'll see a list of deployments
3. Click on the **top deployment** (the most recent one, should say "Ready" with a green dot)
   - It should say something like "4m ago" or "5m ago"

---

### Step 3: View Function Logs

After clicking on the deployment, you'll see several tabs:

1. Click on the **"Functions"** tab
2. You should see a function listed: `/src/index.ts`
3. Click on **"View Logs"** button (or click on the function name)

---

### Step 4: Search for the Debug Logs

Once the logs open, you'll see a search bar at the top.

**To find the Supabase config log:**
1. In the search bar, type: `Backend Supabase Config`
2. Press Enter
3. You should see a log entry that looks like:
   ```
   🔍 Backend Supabase Config: {
     envUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
     usedUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
     envKey: 'SET',
     isNewProject: true,
     isOldProject: false
   }
   ```

**To find SDK key validation logs:**
1. In the search bar, type: `Validating SDK key`
2. Press Enter
3. You should see logs showing SDK key validation attempts

**To find SDK key errors:**
1. In the search bar, type: `Supabase error validating SDK key`
2. Press Enter
3. You should see error details if validation fails

---

## 🎯 Alternative: Use the "Logs" Tab

### Method 2: Direct Logs Tab

1. In your project dashboard, click on the **"Logs"** tab (at the top navigation)
2. You'll see a timeline and log entries
3. Use the search bar to filter logs:
   - Search for: `Backend Supabase Config`
   - Search for: `Validating SDK key`
   - Search for: `Supabase error`

---

## 📸 Visual Guide

### Where to Click:

```
Vercel Dashboard
  └── ux-analytical-tool-gzsn (your project)
      └── Deployments tab
          └── [Click on latest deployment]
              └── Functions tab
                  └── [Click on /src/index.ts]
                      └── View Logs button
                          └── [Search for: "Backend Supabase Config"]
```

---

## 🔍 What You Should See

### On Backend Startup (should appear once per deployment):

```
🔍 Backend Supabase Config: {
  envUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  usedUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  envKey: 'SET',
  isNewProject: true,
  isOldProject: false
}
```

**If you see `isOldProject: true`:**
- ❌ Backend is using old Supabase project
- Fix: Check environment variables in Vercel Settings

---

### When SDK Tries to Validate Key (appears for each request):

```
🔍 Validating SDK key: {
  sdkKeyPrefix: 'ux_2ce0927ed4aa...',
  supabaseUrl: 'https://kkgdxfencpyabcmizytn.supabase.co',
  isNewProject: true,
  isOldProject: false
}
```

---

### If SDK Key Validation Fails:

```
❌ Supabase error validating SDK key: {
  error: '...',
  code: 'PGRST116',
  sdkKey: 'ux_2ce0927ed4aa...',
  supabaseUrl: 'https://...',
  isNewProject: true/false,
  isOldProject: true/false
}
```

**This will tell us:**
- Which Supabase project is being used
- What error occurred (e.g., `PGRST116` = not found)
- Whether it's using old or new project

---

## ⚠️ If You Don't See These Logs

**Possible reasons:**
1. **Backend not redeployed yet:**
   - Go to Deployments → Click "..." → Redeploy
   - Uncheck "Use existing Build Cache"
   - Wait 2-3 minutes

2. **Logs are filtered:**
   - Clear any filters in the logs view
   - Make sure "All" or "Production" environment is selected

3. **Wrong deployment:**
   - Make sure you're looking at the **latest** deployment
   - Check the timestamp (should be recent, like "4m ago")

4. **Logs haven't loaded:**
   - Click "Live" button to see real-time logs
   - Or refresh the page

---

## 🎯 Quick Checklist

- [ ] Opened Vercel Dashboard
- [ ] Selected `ux-analytical-tool-gzsn` project
- [ ] Clicked "Deployments" tab
- [ ] Clicked on latest deployment
- [ ] Clicked "Functions" tab
- [ ] Clicked "View Logs"
- [ ] Searched for "Backend Supabase Config"
- [ ] Found the log showing which Supabase project is being used

---

## 📝 Next Steps

After you find the logs:

1. **Copy the log output** showing:
   - `🔍 Backend Supabase Config:`
   - `🔍 Validating SDK key:` (if present)
   - `❌ Supabase error validating SDK key:` (if present)

2. **Share it with me** so I can see:
   - Which Supabase project the backend is using
   - Why SDK key validation is failing
   - What needs to be fixed

---

## Summary

**Where to find the logs:**
1. Vercel Dashboard → `ux-analytical-tool-gzsn`
2. **Deployments** tab
3. Click **latest deployment**
4. **Functions** tab
5. Click **"View Logs"**
6. Search for: **"Backend Supabase Config"**

That's where you'll see the debug logs we added!
