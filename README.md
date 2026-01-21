# UXCam Analytics Platform

A comprehensive analytics platform with session replay, funnel analysis, and user behavior tracking.

## Features

- 📊 **Analytics Dashboard** - Real-time analytics and insights
- 🎥 **Session Replay** - Record and replay user sessions
- 🔄 **Funnel Analysis** - Track conversion funnels with detailed analytics
- 📍 **Location Tracking** - IP-based geolocation for user sessions
- 🔐 **User Authentication** - Secure user authentication with data isolation
- 📱 **Multi-Platform** - Support for Web, Android, and iOS

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase (Authentication)

### Backend
- Node.js
- Express
- TypeScript
- Supabase (Database)
- Vercel (Deployment)

## Project Structure

```
├── frontend/          # React frontend application
├── backend/           # Express backend API
├── mobile-sdk/        # Mobile SDK implementations
└── public/            # Public assets and SDK files
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn
- Supabase account

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
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
   # Edit .env with your Supabase credentials and API URL
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

## Deployment

### Vercel Deployment

1. **Backend Deployment**
   - Connect your GitHub repository to Vercel
   - Set root directory to `backend`
   - Add environment variables in Vercel dashboard
   - Deploy

2. **Frontend Deployment**
   - Connect your GitHub repository to Vercel
   - Set root directory to `frontend`
   - Add environment variables in Vercel dashboard
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Deploy

### Environment Variables for Production

Make sure to set all required environment variables in Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (backend)
- `SUPABASE_ANON_KEY` (frontend)
- `FRONTEND_URL` (backend - your frontend domain)
- `CORS_ORIGINS` (backend - your frontend domain)

## Features

### User Authentication
- Secure user authentication with Supabase
- Data isolation per user
- Session management

### Session Replay
- Record user interactions
- Replay sessions with rrweb
- Mobile video recording support

### Funnel Analysis
- Create custom funnels
- Track conversion rates
- Analyze drop-offs
- Geographic and device filtering

### Analytics
- Real-time metrics
- User behavior tracking
- Performance monitoring
- Custom events

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
