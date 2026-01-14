# UXCam Analytics Platform

A comprehensive user analytics platform with session replay, funnel analysis, heatmaps, and advanced analytics.

## Features

- **Session Replay**: Record and replay user sessions with DOM snapshots
- **Funnel Analysis**: Track user conversion through multi-step funnels
- **Heatmaps**: Visualize user clicks, scrolls, and movements
- **Advanced Analytics**: Rage clicks, dead taps, performance monitoring
- **Multi-Platform**: Web, Android, and iOS SDK support
- **Real-time Insights**: Live user activity tracking

## Project Structure

```
uxcamm/
├── frontend/          # React + Vite frontend (deploy to Vercel)
├── backend/           # Express.js backend (deploy to Railway)
├── mobile-sdk/        # Android & iOS SDK code
└── public/            # Static assets and SDK scripts
```

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase account
- GitHub account
- Vercel account (for frontend)
- Railway account (for backend)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd uxcamm
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your Supabase credentials
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp env.example .env
   # Edit .env with your Supabase and API URLs
   npm run dev
   ```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## SDK Integration

### Web SDK

Add this to your website's `<head>`:

```html
<script>
  window.UXCamSDK = {
    key: 'ux_YOUR_SDK_KEY',
    apiUrl: 'https://your-backend.railway.app' // Your backend URL
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
<script src="https://your-frontend.vercel.app/uxcam-sdk-rrweb.js"></script>
```

### Mobile SDK

See `mobile-sdk/` directory for Android (Kotlin) and iOS (Swift) SDK implementations.

## Environment Variables

### Backend (`backend/.env`)

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend.railway.app
VITE_ENV=production
```

## Database Setup

1. Run `backend/database/schema.sql` in Supabase SQL Editor
2. Run `backend/database/rls_policies.sql` for security policies

## License

MIT
