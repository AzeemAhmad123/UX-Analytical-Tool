# How to Use Session Retrieval Endpoint

## Endpoint
```
GET http://localhost:3001/api/sessions/:projectId/:sessionId
```

---

## Step 1: Get the Session ID

### Option A: From Browser Console (Easiest)
1. Open `test-sdk.html` in your browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Look for logs like:
   ```
   UXCam SDK: Session ID: sess_1736112345_abc123
   ```
   or
   ```
   UXCam SDK: ✅ Type 2 uploaded, recording active
   ```
5. The session ID will be in the format: `sess_1234567890_abc123`

### Option B: From Network Tab
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "ingest"
4. Click on a POST request to `/api/snapshots/ingest`
5. Check the **Response** - it will show the session_id

### Option C: List All Sessions
First, get all sessions for your project:
```
GET http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e
```

This will return a list of all sessions with their IDs.

---

## Step 2: Use the Session ID

Replace `ACTUAL_SESSION_ID` with the real session ID you got from Step 1.

### Example:
If your session ID is `sess_1736112345_abc123`, use:
```
http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_1736112345_abc123
```

---

## Step 3: Make the Request

### Method 1: Browser (GET request)
Simply paste the URL in your browser:
```
http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_1736112345_abc123
```

### Method 2: PowerShell
```powershell
# Replace with your actual session ID
$projectId = "cdc26f50-a6e3-466f-8bef-5d4740e38a3e"
$sessionId = "sess_1736112345_abc123"  # Replace with real session ID

$url = "http://localhost:3001/api/sessions/$projectId/$sessionId"
$response = Invoke-WebRequest -Uri $url -UseBasicParsing
$response.Content | ConvertFrom-Json
```

### Method 3: curl (if installed)
```bash
curl http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_1736112345_abc123
```

### Method 4: Postman
1. Create new GET request
2. URL: `http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/sess_1736112345_abc123`
3. Click Send

---

## Expected Response

### Success Response (200 OK):
```json
{
  "session": {
    "id": "uuid-from-database",
    "session_id": "sess_1736112345_abc123",
    "project_id": "cdc26f50-a6e3-466f-8bef-5d4740e38a3e",
    "device_info": {
      "userAgent": "Mozilla/5.0...",
      "ip": "::1"
    },
    "start_time": "2026-01-05T18:51:22.781Z",
    "last_activity_time": "2026-01-05T18:52:00.000Z",
    "duration": 38000,
    "event_count": 15,
    "created_at": "2026-01-05T18:51:22.781Z"
  },
  "snapshots": [
    {
      "type": 2,
      "data": { ... },
      "timestamp": 1736112345000
    },
    {
      "type": 3,
      "data": { ... },
      "timestamp": 1736112346000
    }
  ],
  "total_snapshots": 15,
  "snapshot_batches": 3
}
```

### Error Response (404 Not Found):
```json
{
  "error": "Session not found",
  "message": "Session sess_123 not found for project cdc26f50-a6e3-466f-8bef-5d4740e38a3e"
}
```

This means:
- The session ID doesn't exist
- You're using a placeholder (like `sess_123`) instead of real ID
- The session hasn't been recorded yet

---

## Complete Example Workflow

### 1. Record a Session
```bash
# Open test-sdk.html in browser
# Interact with the page
# Check console for session ID
```

### 2. List All Sessions (to find session ID)
```powershell
$projectId = "cdc26f50-a6e3-466f-8bef-5d4740e38a3e"
Invoke-WebRequest -Uri "http://localhost:3001/api/sessions/$projectId" -UseBasicParsing | 
    Select-Object -ExpandProperty Content | 
    ConvertFrom-Json | 
    Select-Object -ExpandProperty sessions | 
    Select-Object session_id, start_time, event_count
```

### 3. Get Specific Session
```powershell
$projectId = "cdc26f50-a6e3-466f-8bef-5d4740e38a3e"
$sessionId = "sess_1736112345_abc123"  # From step 2

$url = "http://localhost:3001/api/sessions/$projectId/$sessionId"
$response = Invoke-WebRequest -Uri $url -UseBasicParsing
$data = $response.Content | ConvertFrom-Json

# View session info
$data.session

# View snapshot count
$data.total_snapshots
```

---

## Quick Test Script

Save this as `test-session.ps1`:

```powershell
$projectId = "cdc26f50-a6e3-466f-8bef-5d4740e38a3e"

Write-Host "📋 Listing all sessions for project..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/sessions/$projectId" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json

if ($data.sessions.Count -eq 0) {
    Write-Host "❌ No sessions found. Record a session first using test-sdk.html" -ForegroundColor Red
    exit
}

Write-Host "✅ Found $($data.sessions.Count) session(s):`n" -ForegroundColor Green

foreach ($session in $data.sessions) {
    Write-Host "Session ID: $($session.session_id)" -ForegroundColor Yellow
    Write-Host "  Start Time: $($session.start_time)" -ForegroundColor Gray
    Write-Host "  Events: $($session.event_count)" -ForegroundColor Gray
    Write-Host ""
    
    # Get full session data
    Write-Host "  Retrieving full session data..." -ForegroundColor Cyan
    $sessionUrl = "http://localhost:3001/api/sessions/$projectId/$($session.session_id)"
    $sessionResponse = Invoke-WebRequest -Uri $sessionUrl -UseBasicParsing
    $sessionData = $sessionResponse.Content | ConvertFrom-Json
    
    Write-Host "  ✅ Snapshot count: $($sessionData.total_snapshots)" -ForegroundColor Green
    Write-Host ""
}
```

Run it:
```powershell
.\test-session.ps1
```

---

## Troubleshooting

### "Session not found" Error
- ✅ Make sure you're using the **actual session ID** from console/network tab
- ✅ Make sure you've recorded a session first
- ✅ Check that the project ID is correct

### Empty Response
- ✅ Make sure backend server is running
- ✅ Check that snapshots were actually uploaded
- ✅ Verify the session ID format is correct

---

**Remember**: Always use the **real session ID** from the SDK, not placeholder text like `sess_123`!

