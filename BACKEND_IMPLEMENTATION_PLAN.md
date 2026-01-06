# Backend Implementation Plan
## UXCam Analytics Tool - Session Recording Backend

---

## 📋 **1. ARCHITECTURE OVERVIEW**

### **Technology Stack**
- **Runtime**: Node.js with Express.js
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Port**: 3001

### **Core Components**
```
Backend Server (Express)
├── Routes
│   ├── /api/snapshots/ingest    → Receive DOM snapshots from SDK
│   ├── /api/events/ingest       → Receive analytics events
│   ├── /api/sessions            → Session management
│   └── /api/projects            → Project management
├── Services
│   ├── Database Service         → Supabase client
│   ├── Session Service          → Create/update sessions
│   └── Snapshot Service         → Store/retrieve snapshots
└── Middleware
    ├── CORS                     → Allow frontend requests
    ├── Auth                     → SDK key validation
    └── Error Handling           → Global error handler
```

---

## 📊 **2. DATABASE SCHEMA**

### **Tables Needed**

#### **A. `projects` Table**
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- name (TEXT)
- sdk_key (TEXT, Unique) → Used for authentication
- platform (TEXT) → 'web', 'mobile', etc.
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### **B. `sessions` Table**
```sql
- id (UUID, Primary Key)
- project_id (UUID, Foreign Key → projects)
- session_id (TEXT) → From SDK (e.g., 'sess_1234567890_abc123')
- device_info (JSONB) → Browser, OS, screen size, etc.
- start_time (TIMESTAMPTZ)
- last_activity_time (TIMESTAMPTZ)
- duration (INTEGER) → milliseconds
- event_count (INTEGER) → Total events in session
- created_at (TIMESTAMPTZ)
- UNIQUE(project_id, session_id)
```

#### **C. `session_snapshots` Table**
```sql
- id (UUID, Primary Key)
- session_id (UUID, Foreign Key → sessions)
- snapshot_data (BYTEA) → Compressed rrweb events
- snapshot_count (INTEGER) → Number of events in this batch
- is_initial_snapshot (BOOLEAN) → true for Type 2, false for incremental
- created_at (TIMESTAMPTZ)
- INDEX(session_id, created_at)
```

#### **D. `events` Table** (Optional - for analytics events)
```sql
- id (UUID, Primary Key)
- session_id (UUID, Foreign Key → sessions)
- type (TEXT) → 'click', 'page_view', 'custom_event', etc.
- timestamp (TIMESTAMPTZ)
- data (JSONB) → Event-specific data
- created_at (TIMESTAMPTZ)
```

---

## 🔌 **3. API ENDPOINTS**

### **A. POST `/api/snapshots/ingest`**
**Purpose**: Receive DOM snapshots from SDK

**Request Body**:
```json
{
  "sdk_key": "ux_5359625f694d41eb869ae9474875cb7a",
  "session_id": "sess_1234567890_abc123",
  "snapshots": "<compressed-string>",  // LZString compressed or JSON
  "snapshot_count": 1,
  "is_initial_snapshot": true
}
```

**Response**:
```json
{
  "success": true,
  "snapshot_count": 1,
  "session_id": "uuid-of-session-in-db"
}
```

**Logic Flow**:
1. Validate SDK key → Get project_id
2. Find or create session
3. Decompress snapshots
4. Store in `session_snapshots` table
5. Update session `last_activity_time` and `event_count`
6. Return success

---

### **B. POST `/api/events/ingest`**
**Purpose**: Receive analytics events (clicks, page views, etc.)

**Request Body**:
```json
{
  "sdk_key": "ux_...",
  "session_id": "sess_...",
  "events": [
    {
      "type": "click",
      "timestamp": "2026-01-05T...",
      "data": { "element": "button", "text": "Submit" }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "events_processed": 5
}
```

---

### **C. GET `/api/sessions/:projectId/:sessionId`**
**Purpose**: Get all snapshots for a session (for replay)

**Response**:
```json
{
  "session": {
    "id": "uuid",
    "session_id": "sess_...",
    "start_time": "...",
    "device_info": {...}
  },
  "snapshots": [
    {
      "id": "uuid",
      "snapshot_data": "<decompressed-rrweb-events>",
      "created_at": "...",
      "is_initial_snapshot": true
    }
  ]
}
```

**Logic Flow**:
1. Validate project access
2. Get session by session_id
3. Get all snapshots for session (ordered by created_at)
4. Decompress snapshot_data
5. Return combined array of rrweb events

---

### **D. GET `/api/projects`**
**Purpose**: Get user's projects (for dashboard)

**Response**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My Project",
      "sdk_key": "ux_...",
      "platform": "web"
    }
  ]
}
```

---

## 🔄 **4. DATA FLOW**

### **Session Recording Flow**
```
1. SDK Initializes
   ↓
2. SDK creates session_id: "sess_1234567890_abc123"
   ↓
3. SDK starts rrweb.record()
   ↓
4. SDK captures Type 2 snapshot (full DOM)
   ↓
5. POST /api/snapshots/ingest
   ├── Backend validates SDK key
   ├── Backend creates session in DB
   ├── Backend stores Type 2 snapshot
   └── Returns success
   ↓
6. SDK enables incremental events
   ↓
7. User interacts (clicks, types, scrolls)
   ↓
8. SDK batches incremental events (Type 3, 4, 5...)
   ↓
9. POST /api/snapshots/ingest (periodically)
   ├── Backend finds existing session
   ├── Backend stores incremental snapshots
   └── Updates session activity
```

### **Session Replay Flow**
```
1. User opens dashboard
   ↓
2. User clicks "View Session"
   ↓
3. GET /api/sessions/:projectId/:sessionId
   ↓
4. Backend retrieves all snapshots
   ↓
5. Backend decompresses and combines events
   ↓
6. Frontend receives ordered array of rrweb events
   ↓
7. Frontend uses rrweb.replay() to render session
```

---

## 🏗️ **5. IMPLEMENTATION STEPS**

### **Step 1: Project Setup**
- [ ] Create `backend/` directory
- [ ] Initialize npm project (`npm init -y`)
- [ ] Install dependencies:
  - `express`
  - `@supabase/supabase-js`
  - `typescript`
  - `@types/node`, `@types/express`
  - `tsx` (for running TypeScript)
  - `cors`
  - `dotenv`
- [ ] Create `tsconfig.json`
- [ ] Create `.env` file for Supabase credentials

### **Step 2: Database Setup**
- [ ] Create tables in Supabase SQL Editor:
  - `projects`
  - `sessions`
  - `session_snapshots`
  - `events` (optional)
- [ ] Create indexes for performance
- [ ] Set up Row Level Security (RLS) policies

### **Step 3: Core Server Setup**
- [ ] Create `src/index.ts` (Express server)
- [ ] Set up CORS middleware
- [ ] Set up error handling middleware
- [ ] Set up body parser middleware
- [ ] Create Supabase client

### **Step 4: SDK Key Validation Middleware**
- [ ] Create `src/middleware/auth.ts`
- [ ] Function: `validateSDKKey(sdk_key) → project_id`
- [ ] Middleware: `authenticateSDK()`

### **Step 5: Session Service**
- [ ] Create `src/services/sessionService.ts`
- [ ] Function: `findOrCreateSession(project_id, session_id, device_info)`
- [ ] Function: `updateSessionActivity(session_id)`

### **Step 6: Snapshot Service**
- [ ] Create `src/services/snapshotService.ts`
- [ ] Function: `storeSnapshot(session_id, snapshot_data, is_initial)`
- [ ] Function: `getSessionSnapshots(session_id) → decompressed events`
- [ ] Handle LZString decompression

### **Step 7: Routes Implementation**

#### **7a. Snapshots Route**
- [ ] Create `src/routes/snapshots.ts`
- [ ] POST `/ingest` endpoint
- [ ] Validate request body
- [ ] Decompress snapshots
- [ ] Store in database
- [ ] Return response

#### **7b. Sessions Route**
- [ ] Create `src/routes/sessions.ts`
- [ ] GET `/:projectId/:sessionId` endpoint
- [ ] Retrieve session and snapshots
- [ ] Decompress and combine events
- [ ] Return formatted response

#### **7c. Events Route** (Optional)
- [ ] Create `src/routes/events.ts`
- [ ] POST `/ingest` endpoint
- [ ] Store analytics events

#### **7d. Projects Route**
- [ ] Create `src/routes/projects.ts`
- [ ] GET `/` endpoint (get user's projects)
- [ ] Use Supabase auth to get user_id

### **Step 8: Testing**
- [ ] Test snapshot ingestion
- [ ] Test session retrieval
- [ ] Test with SDK
- [ ] Verify data in Supabase

---

## 🔐 **6. SECURITY CONSIDERATIONS**

1. **SDK Key Validation**: Every request must validate SDK key
2. **Rate Limiting**: Prevent abuse (optional)
3. **Data Validation**: Validate all incoming data
4. **CORS**: Only allow frontend origin
5. **RLS Policies**: Database-level security in Supabase

---

## 📦 **7. FILE STRUCTURE**

```
backend/
├── src/
│   ├── index.ts                 → Express server entry point
│   ├── config/
│   │   └── supabase.ts          → Supabase client setup
│   ├── middleware/
│   │   ├── auth.ts              → SDK key validation
│   │   ├── cors.ts              → CORS configuration
│   │   └── errorHandler.ts      → Global error handler
│   ├── routes/
│   │   ├── snapshots.ts         → Snapshot ingestion
│   │   ├── sessions.ts          → Session retrieval
│   │   ├── events.ts            → Event ingestion (optional)
│   │   └── projects.ts          → Project management
│   └── services/
│       ├── sessionService.ts    → Session CRUD operations
│       └── snapshotService.ts  → Snapshot storage/retrieval
├── package.json
├── tsconfig.json
├── .env                         → Environment variables
└── README.md
```

---

## ✅ **8. SUCCESS CRITERIA**

1. ✅ SDK can send Type 2 snapshot → Backend stores it
2. ✅ SDK can send incremental events → Backend stores them
3. ✅ Dashboard can retrieve session → Gets all snapshots
4. ✅ Session replay works → Events are in correct order
5. ✅ No data loss → All events are stored
6. ✅ Performance → Fast ingestion and retrieval

---

## 🚀 **9. IMPLEMENTATION ORDER**

**Phase 1: Foundation** (Steps 1-3)
- Set up project, database, basic server

**Phase 2: Core Services** (Steps 4-6)
- Auth, session service, snapshot service

**Phase 3: API Endpoints** (Step 7)
- Implement all routes

**Phase 4: Testing** (Step 8)
- Test with SDK, verify everything works

---

## 📝 **10. KEY DECISIONS**

1. **Compression**: Use LZString (already in SDK) or gzip
2. **Storage**: Store compressed or decompressed? → **Compressed** (saves space)
3. **Batch Size**: How many events per snapshot batch? → **50 events** (configurable)
4. **Session Creation**: Create on first snapshot or separate endpoint? → **On first snapshot**
5. **Error Handling**: Fail silently or return errors? → **Return errors, log everything**

---

## 🎯 **READY TO IMPLEMENT?**

This plan provides:
- ✅ Clear architecture
- ✅ Database schema
- ✅ API specifications
- ✅ Step-by-step guide
- ✅ File structure

**Next**: Start with Step 1 (Project Setup) and build incrementally.

