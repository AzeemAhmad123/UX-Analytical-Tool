# Session Replay & Analytics

A full-stack product analytics application that connects browser event capture, session playback, and dashboard workflows.

**[View the recorded walkthrough](https://portfolio-gamma-lake-28.vercel.app/)** · **[Frontend](./frontend)** · **[Backend](./backend)**

![Session replay application preview](https://raw.githubusercontent.com/AzeemAhmad123/Portfolio/main/assets/media/session-replay-poster.jpg)

## What this project explores

- Recording and replaying browser interactions with **rrweb**.
- Organizing sessions and event data into a usable analytics interface.
- Exploring heatmaps, funnels, and dashboard views.
- Connecting a React frontend to an Express ingestion API and Supabase storage.

My work covers the interface, event capture and replay, and validation of the backend ingestion flow. This repository is a development project; the portfolio includes a recorded walkthrough of the implemented experience.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Replay & visualization | rrweb, rrweb-player, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase / PostgreSQL |

## Repository guide

| Path | Purpose |
| --- | --- |
| [frontend/src](./frontend/src) | Application interface and client-side workflows |
| [backend/src](./backend/src) | Backend application and API implementation |
| [backend/database](./backend/database) | SQL schema, policies, and incremental database changes |
| [backend/public](./backend/public) | Public backend assets |
| [PORTFOLIO_DESCRIPTION.md](./PORTFOLIO_DESCRIPTION.md) | Additional project notes |

## Local development

Use Node.js and npm versions compatible with both the backend package and the Vite frontend. You will also need your own Supabase project.

1. Clone the repository:

   ```bash
   git clone https://github.com/AzeemAhmad123/UX-Analytical-Tool.git
   cd UX-Analytical-Tool
   ```

2. Review the SQL files in [backend/database](./backend/database) and configure your Supabase schema. This folder contains both base schema files and incremental changes; review their dependencies before applying them to an existing database.

3. Create `backend/.env` using `backend/env.example` as a guide. Supply your own Supabase URL and backend service key. Set `PORT=3001` and allow your local frontend origin.

4. Create `frontend/.env.local` with your own project settings:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_URL=http://localhost:3001
   ```

5. Start the backend in one terminal:

   ```bash
   cd backend
   npm ci
   npm run dev
   ```

6. Start the frontend from the repository root in a second terminal:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Open the local URL printed by Vite.

## Configuration & scope

Keep service credentials on the backend and out of Git. Only use a public/anon Supabase key in the frontend. Before recording sessions outside a test environment, review the application's privacy settings, access policies, and recording configuration.

The backend's current `test` script is a placeholder. A complete automated test suite and production-readiness review are not represented by this README.

## More work

Built by [Azeem Ahmad](https://github.com/AzeemAhmad123). Explore the [portfolio](https://portfolio-gamma-lake-28.vercel.app/) for computer vision demos and other full-stack projects.

