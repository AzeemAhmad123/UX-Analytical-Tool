# UXCam Analytics Clone - Full-Stack User Experience Analytics Platform

## Project Overview

A comprehensive, production-ready analytics platform inspired by UXCam, designed to help businesses understand user behavior through session replay, heatmaps, funnel analysis, and advanced user experience metrics. This full-stack application provides real-time insights into how users interact with web and mobile applications.

## Key Features

### 🎥 **Session Replay & Recording**
- **DOM Recording**: Full session replay using rrweb library for pixel-perfect playback
- **Session Management**: Track and replay complete user sessions with timeline navigation
- **Session Filtering**: Filter sessions by date range, device type, platform, and custom criteria
- **Session Analytics**: View session duration, page views, events, and user journey
- **Privacy-First**: Built-in privacy controls to mask sensitive data during recording

### 📊 **Advanced Analytics Dashboard**
- **Real-Time Metrics**: Track sessions, active users, events, and engagement metrics
- **Interactive Charts**: Beautiful visualizations using Recharts (Area, Bar, Pie, Line charts)
- **Time-Based Analysis**: View analytics by day, week, month with trend indicators
- **Platform Filtering**: Separate analytics for Web, Android, and iOS platforms
- **Performance Metrics**: Track page load times, session duration, and user engagement

### 🔥 **Heatmaps**
- **Click Heatmaps**: Visualize where users click most frequently
- **Scroll Heatmaps**: Understand how far users scroll on pages
- **Move Heatmaps**: Track mouse movement patterns
- **Attention Heatmaps**: Identify areas of high user attention
- **Export Capabilities**: Download heatmap data and visualizations

### 🎯 **Funnel Analysis**
- **Visual Funnel Builder**: Drag-and-drop interface to create custom conversion funnels
- **Drop-off Analysis**: Identify where users abandon the conversion process
- **Funnel Comparison**: Compare funnel performance across different time periods
- **Anomaly Detection**: Automatically detect unusual patterns in funnel performance
- **Geographic Breakdown**: Analyze funnel performance by country/region
- **Form Funnel Tracking**: Specialized tracking for form completion funnels
- **Alert System**: Get notified when funnel conversion rates drop

### 🚨 **Smart Alerts & Monitoring**
- **Funnel Alerts**: Automated alerts for conversion rate drops and anomalies
- **Scheduled Reports**: Email reports with analytics summaries
- **Rage Click Detection**: Identify frustrated user interactions
- **Performance Monitoring**: Track and alert on web performance issues

### 👥 **User Segmentation**
- **Custom Segments**: Create user segments based on behavior, properties, and events
- **User Properties**: Track and analyze custom user attributes
- **Cohort Analysis**: Analyze user groups over time

### 🔗 **Sharing & Collaboration**
- **Share Links**: Generate shareable links for sessions, funnels, and dashboards
- **Team Collaboration**: Share insights with team members
- **Export Options**: Export data in various formats

### 🔒 **Privacy & Security**
- **Privacy Settings**: Configure data masking, PII protection, and GDPR compliance
- **SDK Key Management**: Secure SDK key generation and management
- **Domain Whitelisting**: Control which domains can use your SDK
- **Data Retention**: Configurable data retention policies

### 📱 **Cross-Platform SDK**
- **Lightweight SDK**: Production-safe JavaScript SDK with error handling
- **Easy Integration**: Simple script tag integration for any website
- **Event Tracking**: Track custom events, page views, and user interactions
- **Automatic Capture**: Automatically captures clicks, scrolls, form inputs, and navigation
- **Performance Optimized**: Minimal impact on website performance

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **rrweb & rrweb-player** for session replay
- **GSAP** for animations
- **Lucide React** for icons
- **Vite** for build tooling

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Supabase** (PostgreSQL) for database
- **RESTful API** architecture
- **LZ-String** for data compression
- **Multer** for file uploads

### Infrastructure
- **Supabase** for database and authentication
- **Vercel** for deployment
- **Production-ready** error handling and logging

## Technical Highlights

### Performance Optimizations
- **Data Compression**: LZ-String compression for session snapshots
- **Efficient Queries**: Optimized database queries with proper indexing
- **Pagination**: Implemented for large datasets
- **Lazy Loading**: Components and data loaded on demand

### Code Quality
- **TypeScript**: Full type safety across frontend and backend
- **Error Handling**: Comprehensive error handling and user feedback
- **Production-Safe SDK**: SDK designed to never break client websites
- **Modular Architecture**: Clean separation of concerns

### User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Intuitive UI**: Modern, clean interface inspired by industry leaders
- **Real-Time Updates**: Live data updates and notifications
- **Accessibility**: Built with accessibility best practices

## Database Schema

Comprehensive database design with tables for:
- Sessions and session snapshots
- Events and user interactions
- Funnels and funnel steps
- Heatmaps and analytics data
- User properties and segments
- Alerts and scheduled reports
- Share links and privacy settings
- Projects and SDK keys

## API Endpoints

RESTful API with endpoints for:
- Session management and replay
- Analytics and metrics
- Funnel creation and analysis
- Heatmap generation
- Event tracking
- User segmentation
- Alert management
- Scheduled reports
- Privacy settings

## Use Cases

1. **E-commerce**: Track checkout funnels, identify drop-off points, optimize conversion
2. **SaaS Products**: Understand user onboarding, feature adoption, and churn
3. **Web Applications**: Debug user issues, improve UX, track feature usage
4. **Mobile Apps**: Analyze user flows, identify friction points, optimize engagement
5. **Marketing**: Measure campaign effectiveness, track user journeys, optimize landing pages

## Project Structure

```
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Main application pages
│   │   ├── services/     # API service layer
│   │   └── config/       # Configuration files
│   └── public/           # Static assets and SDK files
│
├── backend/          # Node.js + Express backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth and validation
│   │   └── utils/        # Utility functions
│   └── database/         # SQL migration files
│
└── Documentation/    # Integration guides and docs
```

## Key Achievements

✅ **Full-Stack Development**: Complete end-to-end implementation from SDK to dashboard
✅ **Real-Time Analytics**: Live session tracking and analytics processing
✅ **Scalable Architecture**: Designed to handle large volumes of session data
✅ **Production Ready**: Error handling, security, and performance optimizations
✅ **Modern Tech Stack**: Latest technologies and best practices
✅ **Comprehensive Features**: 15+ major features matching industry standards

## Portfolio Value

This project demonstrates:
- **Full-stack development** capabilities (Frontend + Backend + Database)
- **Complex data visualization** and analytics implementation
- **Real-time data processing** and session recording
- **API design** and RESTful architecture
- **TypeScript** expertise across the stack
- **UI/UX design** skills with modern, professional interfaces
- **Performance optimization** and scalability considerations
- **Security and privacy** implementation
- **SDK development** for third-party integration
- **Database design** and optimization

---

**Perfect for showcasing**: Full-stack development, analytics platforms, SaaS applications, data visualization, real-time systems, and enterprise-level web applications.
