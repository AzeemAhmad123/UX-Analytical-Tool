# UXCam Clone - Frontend

This is the frontend application for the UXCam analytics platform clone.

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── TrustedBrands.tsx
│   │   ├── Ratings.tsx
│   │   ├── UsersLoveUs.tsx
│   │   ├── DataSecurity.tsx
│   │   └── TaraBanner.tsx
│   ├── App.tsx        # Main app component
│   ├── App.css        # Global styles
│   └── index.css      # Base styles
├── public/
│   └── images/        # Static images
└── package.json
```

## Features

- Responsive homepage design matching UXCam
- Header with navigation and CTAs
- Hero section with feature highlights
- Trusted brands section
- User testimonials and case studies
- Tara AI introduction banner
- Data security section

## Technologies

- React 19
- TypeScript
- Vite
- CSS3
