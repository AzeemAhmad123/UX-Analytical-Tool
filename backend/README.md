# UXCam Analytics Backend

Backend server for UXCam Analytics Tool - Session Recording & Replay

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your Supabase credentials
   ```

3. **Set up database**:
   - Open Supabase SQL Editor
   - Run `database/schema.sql`
   - This creates all required tables

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (for backend operations)
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## API Endpoints

### Phase 1 (Current)
- `GET /health` - Health check

### Phase 3 (Coming)
- `POST /api/snapshots/ingest` - Receive DOM snapshots
- `GET /api/sessions/:projectId/:sessionId` - Get session for replay
- `POST /api/events/ingest` - Receive analytics events
- `GET /api/projects` - Get user projects

## Development Phases

- ✅ **Phase 1**: Foundation (Project setup, database, basic server)
- ⏳ **Phase 2**: Core Services (Auth, session service, snapshot service)
- ⏳ **Phase 3**: API Routes (All endpoints)
- ⏳ **Phase 4**: Testing & Verification

