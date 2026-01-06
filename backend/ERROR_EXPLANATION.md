# Error Explanation

## Error 1: `/api/snapshots/ingest` - "Route not found"

### Status: ✅ **ROUTE EXISTS AND WORKS!**

**What's happening:**
- The route is correctly defined: `POST /api/snapshots/ingest`
- When tested, it returns `{"error":"Invalid SDK key"}` - this means the route IS found!
- The "Route not found" error you're seeing might be because:
  1. **You're using GET instead of POST** - This endpoint only accepts POST requests
  2. **Server needs restart** - If you just added the route, restart the server
  3. **Browser cache** - Try hard refresh (Ctrl+Shift+R)

**How to test correctly:**
```bash
# Use POST method (not GET in browser)
POST http://localhost:3001/api/snapshots/ingest
Content-Type: application/json

{
  "sdk_key": "ux_your_actual_sdk_key_here",
  "session_id": "sess_123",
  "snapshots": "...",
  "snapshot_count": 1,
  "is_initial_snapshot": true
}
```

**In browser:** You can't test POST endpoints directly by typing the URL. Use:
- Postman
- curl
- Or the SDK (which sends POST requests)

---

## Error 2: `/api/sessions/:projectId/:sessionId` - "Session not found"

### Status: ⚠️ **NOT AN ERROR - User Input Issue**

**What's happening:**
- The error message shows: `"Session :sessionId not found for project :projectId"`
- Notice the `:sessionId` and `:projectId` - these are **placeholder text**, not actual IDs!
- You're typing the URL with the placeholder text instead of real values

**The Problem:**
You're accessing: `localhost:3001/api/sessions/:projectId/:sessionId`
But you should use: `localhost:3001/api/sessions/ACTUAL_PROJECT_ID/ACTUAL_SESSION_ID`

**How to fix:**
1. Get a real project ID from: `GET /api/projects`
2. Get a real session ID (from SDK or database)
3. Use them in the URL:
   ```
   http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_1234567890_abc123
   ```

**Example:**
- ❌ Wrong: `localhost:3001/api/sessions/:projectId/:sessionId`
- ✅ Right: `localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_123`

---

## Summary

| Issue | Status | Solution |
|-------|--------|----------|
| `/api/snapshots/ingest` 404 | ✅ Route works | Use POST method, not GET in browser |
| `/api/sessions/:projectId/:sessionId` | ⚠️ User error | Replace `:projectId` and `:sessionId` with actual IDs |

---

## Quick Test

1. **Test snapshots route (POST):**
   ```powershell
   # Get a real SDK key first
   $response = Invoke-WebRequest -Uri "http://localhost:3001/api/projects" -UseBasicParsing
   $projects = ($response.Content | ConvertFrom-Json).projects
   $sdkKey = $projects[0].sdk_key
   
   # Test snapshot ingestion
   $body = @{
       sdk_key = $sdkKey
       session_id = "sess_test_123"
       snapshots = "test_data"
       snapshot_count = 1
       is_initial_snapshot = true
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3001/api/snapshots/ingest" `
       -Method POST `
       -Headers @{"Content-Type"="application/json"} `
       -Body $body
   ```

2. **Test sessions route (with real IDs):**
   ```powershell
   # Get project ID
   $projectId = $projects[0].id
   
   # Test session retrieval (will return 404 if session doesn't exist, which is correct)
   Invoke-WebRequest -Uri "http://localhost:3001/api/sessions/$projectId/sess_test_123" -UseBasicParsing
   ```

---

**Conclusion:** The routes are working correctly! The issues are:
1. Using GET instead of POST for snapshots
2. Using placeholder text instead of real IDs for sessions

