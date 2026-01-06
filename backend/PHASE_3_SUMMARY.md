# Phase 3: API Routes - COMPLETE ✅

## What Was Created

### 1. **Snapshots Route** (`src/routes/snapshots.ts`)
- ✅ `POST /api/snapshots/ingest` - Receives DOM snapshots from SDK
- ✅ Validates SDK key using `authenticateSDK` middleware
- ✅ Creates/finds session automatically
- ✅ Decompresses LZString compressed data
- ✅ Stores snapshot in database (BYTEA)
- ✅ Updates session activity

**Request Body:**
```json
{
  "sdk_key": "ux_...",
  "session_id": "sess_1234567890_abc123",
  "snapshots": "<compressed-string>",
  "snapshot_count": 1,
  "is_initial_snapshot": true
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "session_created": true,
  "snapshot_count": 1,
  "is_initial_snapshot": true
}
```

---

### 2. **Sessions Route** (`src/routes/sessions.ts`)
- ✅ `GET /api/sessions/:projectId/:sessionId` - Get session for replay
- ✅ Retrieves session by project and session ID
- ✅ Gets all snapshots for session
- ✅ Decompresses all snapshots
- ✅ Returns combined array of rrweb events

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "session_id": "sess_...",
    "device_info": {...},
    "start_time": "...",
    "event_count": 50
  },
  "snapshots": [...], // Array of rrweb events
  "total_snapshots": 50,
  "snapshot_batches": 3
}
```

---

### 3. **Events Route** (`src/routes/events.ts`)
- ✅ `POST /api/events/ingest` - Receives analytics events
- ✅ Validates SDK key
- ✅ Creates/finds session
- ✅ Stores events in `events` table
- ✅ Updates session activity

**Request Body:**
```json
{
  "sdk_key": "ux_...",
  "session_id": "sess_...",
  "events": [
    {
      "type": "click",
      "timestamp": "2026-01-05T...",
      "data": {...}
    }
  ]
}
```

---

### 4. **Projects Route** (`src/routes/projects.ts`)
- ✅ `GET /api/projects` - Get all projects
- ✅ `GET /api/projects/:id` - Get specific project
- ✅ Returns project information (without sensitive data)

---

## Dependencies Installed

- ✅ `lz-string` - For decompressing LZString compressed data
- ✅ `@types/lz-string` - TypeScript types

---

## Routes Registered

All routes are now registered in `src/index.ts`:
```typescript
app.use('/api/snapshots', snapshotsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/projects', projectsRouter)
```

---

## Key Features

1. **LZString Decompression**: Automatically handles compressed snapshot data
2. **Automatic Session Creation**: Sessions created on first snapshot/event
3. **Error Handling**: Comprehensive error handling with proper HTTP status codes
4. **Type Safety**: All routes fully typed with TypeScript
5. **SDK Key Validation**: All protected routes use `authenticateSDK` middleware

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/snapshots/ingest` | SDK Key | Receive DOM snapshots |
| GET | `/api/sessions/:projectId/:sessionId` | No* | Get session for replay |
| POST | `/api/events/ingest` | SDK Key | Receive analytics events |
| GET | `/api/projects` | No* | Get all projects |
| GET | `/api/projects/:id` | No* | Get specific project |

*Note: Session and project endpoints should be protected with user authentication in production

---

## Data Flow

### Snapshot Ingestion Flow
```
SDK → POST /api/snapshots/ingest
  → authenticateSDK() validates sdk_key
  → findOrCreateSession() gets/creates session
  → LZString.decompress() decompresses data
  → storeSnapshot() saves to database
  → updateSessionActivity() updates session
  → Returns success
```

### Session Retrieval Flow
```
Frontend → GET /api/sessions/:projectId/:sessionId
  → getSessionByProjectAndSessionId() finds session
  → getSessionSnapshots() gets all snapshots
  → LZString.decompress() for each snapshot
  → Combines all events into single array
  → Returns session + events
```

---

## Testing Phase 3

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```

### Test 2: Snapshot Ingestion (requires valid SDK key)
```bash
curl -X POST http://localhost:3001/api/snapshots/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "sdk_key": "your-sdk-key",
    "session_id": "sess_123",
    "snapshots": "compressed-data",
    "snapshot_count": 1,
    "is_initial_snapshot": true
  }'
```

### Test 3: Get Session
```bash
curl http://localhost:3001/api/sessions/project-uuid/sess_123
```

### Test 4: Get Projects
```bash
curl http://localhost:3001/api/projects
```

---

## Next: Phase 4

Phase 4 will involve:
- Testing with actual SDK
- Verifying data storage in Supabase
- Testing session replay
- End-to-end verification

---

**Status**: ✅ Phase 3 Complete - All API Routes Implemented!

