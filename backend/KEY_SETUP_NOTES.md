# Supabase Keys Setup

## ✅ Keys Saved

### Frontend (Already Configured)
- **File**: `frontend/src/config/supabase.ts`
- **Key Type**: Publishable Key (sb_publishable_...)
- **Key**: `sb_publishable_IQaV6WzS7sjTUsV9y4oVuQ_0XovEORx`
- **Status**: ✅ Already saved and working

### Backend (Just Created)
- **File**: `backend/.env`
- **Key Type**: Currently using Publishable Key (temporary)
- **Key**: `sb_publishable_IQaV6WzS7sjTUsV9y4oVuQ_0XovEORx`
- **Status**: ⚠️ Needs Service Role Key for full functionality

---

## ⚠️ Important: Backend Needs Service Role Key

The backend is currently using the **publishable key**, but for full functionality (creating sessions, storing snapshots, etc.), you need the **service_role key**.

### How to Get Service Role Key:

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `xrvmiyrsxwrruhdljkoz`
3. Go to **Settings** → **API**
4. Scroll down to find **service_role** key
5. It will look like: `sb_secret_...` or `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
6. Copy it and update `backend/.env`:

```env
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

### Why Service Role Key?

- **Publishable Key**: Limited permissions, respects Row Level Security (RLS)
- **Service Role Key**: Full admin access, bypasses RLS (needed for backend operations)

---

## Current Status

✅ Frontend key: Saved and working  
⚠️ Backend key: Using publishable key (will work for reading, may fail for writing)

**Next Step**: Get service_role key from Supabase Dashboard and update `backend/.env`

