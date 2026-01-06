# Quick Test Guide

## ✅ SDK Keys Added

I've updated `test-sdk.html` with your real SDK keys from the projects list.

### Active SDK Key
- **SDK Key**: `ux_f0e3180a7c0edf5d69f66edbd08d43d8`
- **Project ID**: `cdc26f50-a6e3-466f-8bef-5d4740e38a3e`
- **Project Name**: Test Project 20260105235121

### Alternative SDK Keys (commented in test-sdk.html)
- `ux_5359625f694d41eb869ae9474875cb7a` - test project
- `ux_efdb678cd37b48ab9108a227234ebdf4` - testing project

---

## 🧪 How to Test

### Step 1: Record a Session
1. Make sure backend server is running: `cd backend && npm run dev`
2. Open `test-sdk.html` in your browser
3. Interact with the page (click buttons, type in inputs, scroll)
4. Check browser console - you should see:
   - `UXCam SDK: ✅ Type 2 uploaded, recording active`
   - Session ID (e.g., `sess_1234567890_abc123`)

### Step 2: Verify Session Was Created
After recording, check if session exists:
```
GET http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e
```

This will list all sessions for your project.

### Step 3: Retrieve Session for Replay
Use the actual session ID from Step 1:
```
GET http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_1234567890_abc123
```

Replace `sess_1234567890_abc123` with the actual session ID from the console.

---

## ⚠️ About the "Session not found" Error

The error you saw:
```json
{"error":"Session not found","message":"Session sess_123 not found for project cdc26f50-a6e3-466f-8bef-5d4740e38a3e"}
```

This is **normal** because:
- `sess_123` is just a placeholder/example
- You need to use the **actual session ID** that the SDK generates
- The SDK creates session IDs like: `sess_1234567890_abc123` (with timestamp)

**Solution**: 
1. Record a session using `test-sdk.html`
2. Check the browser console for the actual session ID
3. Use that session ID in the API call

---

## 📋 Quick Test Checklist

- [ ] Backend server running on port 3001
- [ ] `test-sdk.html` opened in browser
- [ ] SDK key configured (already done ✅)
- [ ] Interacted with page (clicked, typed, scrolled)
- [ ] Checked console for session ID
- [ ] Tested session retrieval with real session ID

---

## 🔍 Debugging

### Check if snapshots are being sent:
1. Open browser DevTools → Network tab
2. Filter by "ingest"
3. Look for POST requests to `/api/snapshots/ingest`
4. Check response status (should be 200)

### Check backend logs:
- Look for: `UXCam SDK: Uploading Type 2 snapshot...`
- Look for: `✅ Type 2 uploaded, recording active`

---

**Status**: ✅ Ready to test! Open `test-sdk.html` and start recording!

