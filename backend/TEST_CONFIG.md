# Test Configuration

## SDK Keys Available

I've updated `test-sdk.html` with your real SDK keys. Here are the available projects:

### Project 1 (Currently Active in test-sdk.html)
- **Name**: Test Project 20260105235121
- **ID**: `cdc26f50-a6e3-466f-8bef-5d4740e38a3e`
- **SDK Key**: `ux_f0e3180a7c0edf5d69f66edbd08d43d8`
- **Status**: ✅ Active in test-sdk.html

### Project 2 (Alternative)
- **Name**: test
- **ID**: `77cae3c9-37c8-420d-af37-ac563bc0d1cc`
- **SDK Key**: `ux_5359625f694d41eb869ae9474875cb7a`

### Other Projects
- **testing**: `ux_efdb678cd37b48ab9108a227234ebdf4`
- **Azeem**: `ux_2ea4f285dce1436a9bec265b5f668f4d`
- **test2**: `ux_fd3b1802bd11443d85562f0aeb570c83`

---

## How to Test

### 1. Test Snapshot Ingestion
1. Open `test-sdk.html` in browser
2. The SDK will automatically start recording
3. Interact with the page (click, type, scroll)
4. Check browser console for logs
5. Check backend logs for ingestion

### 2. Test Session Retrieval
After recording a session, use:
```
GET http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e/SESSION_ID
```

Replace `SESSION_ID` with the actual session ID from the SDK (check console logs).

### 3. List Sessions for Project
```
GET http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e
```

---

## Expected Behavior

1. **First Load**: SDK creates a session ID (e.g., `sess_1234567890_abc123`)
2. **Type 2 Snapshot**: Full DOM snapshot is captured and uploaded
3. **Incremental Events**: User interactions are captured and batched
4. **Session Storage**: All data stored in database

---

## Troubleshooting

### "Session not found" Error
- This is **normal** if you haven't recorded a session yet
- Record a session first using `test-sdk.html`
- Then use the actual session ID (not `sess_123`)

### "Route not found" for `/api/snapshots/ingest`
- Make sure you're using **POST** method (not GET)
- The SDK automatically uses POST
- If testing manually, use Postman or curl

---

## Quick Test Commands

### Test with curl (PowerShell):
```powershell
# Test snapshot ingestion (use real SDK key)
$body = @{
    sdk_key = "ux_f0e3180a7c0edf5d69f66edbd08d43d8"
    session_id = "sess_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
    snapshots = "test_data"
    snapshot_count = 1
    is_initial_snapshot = true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/snapshots/ingest" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

### List Sessions:
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/sessions/cdc26f50-a6e3-466f-8bef-5d4740e38a3e" -UseBasicParsing
```

---

**Status**: ✅ SDK keys configured and ready for testing!

