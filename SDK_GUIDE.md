# UXCam Analytics SDK - Complete Guide

## 📋 Table of Contents
1. [What is the SDK?](#what-is-the-sdk)
2. [How It Works](#how-it-works)
3. [Getting Your SDK Code](#getting-your-sdk-code)
4. [Installing the SDK](#installing-the-sdk)
5. [What Gets Tracked](#what-gets-tracked)
6. [Data Flow](#data-flow)
7. [Viewing Data in Dashboard](#viewing-data-in-dashboard)

---

## 🎯 What is the SDK?

The SDK (Software Development Kit) is a JavaScript library that:
- **Tracks user behavior** on websites (clicks, page views, scrolls, etc.)
- **Records visual sessions** using DOM snapshots (like a screen recording)
- **Captures device info** (browser, OS, location, etc.)
- **Sends data** to your backend for analysis

Think of it like **Google Analytics + Hotjar** combined - it tracks events AND records visual sessions.

---

## 🔄 How It Works

### Architecture Overview

```
User's Website (with SDK)
    ↓
SDK captures events & DOM snapshots
    ↓
Sends to Backend API (ux-analytical-tool-gzsn.vercel.app)
    ↓
Backend stores in Supabase Database
    ↓
Dashboard (ux-analytical-tool-ochre.vercel.app) displays data
```

### Components

1. **SDK Files** (in `frontend/public/`):
   - `uxcam-sdk-rrweb.js` - Full SDK with visual recording
   - `uxcam-sdk.js` - Basic SDK (events only)

2. **Backend API** (`backend/src/routes/events.ts`):
   - Receives events from SDK
   - Validates SDK key
   - Stores data in database

3. **Dashboard** (`frontend/src/pages/dashboard/`):
   - Shows sessions, events, analytics
   - Replays recorded sessions

---

## 🔑 Getting Your SDK Code

### Step 1: Create a Project
1. Log into your dashboard: `https://ux-analytical-tool-ochre.vercel.app`
2. Go to **Projects** page
3. Click **"Create Project"**
4. Enter project name (e.g., "My Website")
5. Click **"Create"**

### Step 2: Get SDK Installation Code
1. On the **Projects** page, find your project
2. Click the **"Code"** icon (or expand the project)
3. You'll see installation code like this:

```html
<!-- Load rrweb for visual session replay -->
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>

<!-- UXCam SDK Configuration -->
<script>
  window.UXCamSDK = {
    key: 'ux_abc123...',  // Your unique SDK key
    apiUrl: 'https://ux-analytical-tool-gzsn.vercel.app'  // Your backend URL
  };
</script>

<!-- Load UXCam SDK -->
<script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js" async></script>
```

4. Click **"Copy"** to copy the code

---

## 📦 Installing the SDK

### For HTML Websites

1. **Open your website's HTML file** (usually `index.html` or `header.php`)

2. **Paste the SDK code** in the `<head>` section, before `</head>`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
  
  <!-- Paste SDK code here -->
  <!-- Load rrweb for visual session replay -->
  <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
  
  <script>
    window.UXCamSDK = {
      key: 'ux_abc123...',
      apiUrl: 'https://ux-analytical-tool-gzsn.vercel.app'
    };
  </script>
  
  <script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js" async></script>
</head>
<body>
  <!-- Your website content -->
</body>
</html>
```

3. **Save and deploy** your website

### For React/Next.js/Vue/etc.

#### React (in `public/index.html` or `index.html`):
Same as HTML - paste in the `<head>` section.

#### Next.js (in `pages/_app.js` or `app/layout.js`):
```javascript
import Script from 'next/script'

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Load rrweb */}
      <Script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js" />
      
      {/* SDK Configuration */}
      <Script id="uxcam-config">
        {`
          window.UXCamSDK = {
            key: 'ux_abc123...',
            apiUrl: 'https://ux-analytical-tool-gzsn.vercel.app'
          };
        `}
      </Script>
      
      {/* Load SDK */}
      <Script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js" strategy="afterInteractive" />
      
      <Component {...pageProps} />
    </>
  )
}
```

#### WordPress:
1. Go to **Appearance → Theme Editor**
2. Edit `header.php`
3. Paste SDK code before `</head>`

---

## 📊 What Gets Tracked

### Automatic Events:
- ✅ **Page Views** - Every page navigation
- ✅ **Clicks** - All button/link clicks
- ✅ **Scrolls** - Scroll depth and position
- ✅ **Form Interactions** - Input focus, blur, submit
- ✅ **Session Start/End** - When user arrives/leaves
- ✅ **DOM Changes** - Visual snapshots for replay

### Device Information:
- 🌍 **Location** - Country, city, region (from IP)
- 💻 **Device** - Desktop, Mobile, Tablet
- 🔧 **Browser** - Chrome, Firefox, Safari, etc.
- 📱 **OS** - Windows, macOS, iOS, Android
- 📍 **IP Address** - Anonymized for privacy

### Custom Events (Optional):
You can track custom events in your code:
```javascript
// Track a custom event
if (window.UXCamSDK && window.UXCamSDK.trackEvent) {
  window.UXCamSDK.trackEvent('purchase_completed', {
    product_id: '123',
    price: 99.99,
    currency: 'USD'
  });
}
```

---

## 🔄 Data Flow

### Step-by-Step Process:

1. **User visits website** with SDK installed
   ```
   User → Website (with SDK)
   ```

2. **SDK initializes** when page loads
   ```javascript
   window.UXCamSDK = { key: '...', apiUrl: '...' }
   // SDK starts recording
   ```

3. **SDK captures events** as user interacts
   ```
   User clicks button → SDK captures click event
   User scrolls → SDK captures scroll event
   User navigates → SDK captures page view
   ```

4. **SDK batches events** (collects multiple events)
   ```
   Events: [click, scroll, pageview, click]
   ```

5. **SDK sends to backend** (every 5 seconds or when batch is full)
   ```javascript
   POST https://ux-analytical-tool-gzsn.vercel.app/api/events/ingest
   {
     sdk_key: 'ux_abc123...',
     session_id: 'session_xyz...',
     events: [...],
     device_info: {...}
   }
   ```

6. **Backend validates** SDK key and stores data
   ```
   Backend → Validates key → Finds project → Stores in database
   ```

7. **Dashboard displays** the data
   ```
   Dashboard → Fetches from database → Shows sessions/analytics
   ```

---

## 📈 Viewing Data in Dashboard

### 1. Sessions List
- Go to **Dashboard → Sessions**
- See all user sessions
- View: Location, Device, Browser, Duration, Events count

### 2. Session Replay
- Click on any session
- Watch the **visual replay** (like a video recording)
- See exactly what the user did

### 3. Analytics
- **Funnel Analysis** - See conversion rates
- **Event Tracking** - See all events
- **User Journey** - See user paths

### 4. Projects
- **Toggle Active/Inactive** - Enable/disable tracking
- **View SDK Key** - Copy your key
- **View Stats** - See session counts

---

## 🔧 SDK Configuration Options

### Basic Configuration:
```javascript
window.UXCamSDK = {
  key: 'ux_abc123...',           // Required: Your SDK key
  apiUrl: 'https://...',          // Optional: Backend URL (auto-detected)
  debug: false,                   // Optional: Enable debug logs
  batchSize: 10,                  // Optional: Events per batch (default: 10)
  flushInterval: 5000,            // Optional: Send interval in ms (default: 5000)
  sessionTimeout: 1800000         // Optional: Session timeout in ms (default: 30min)
};
```

### Debug Mode:
Enable debug logs to see what SDK is doing:
```javascript
window.UXCamSDK = {
  key: 'ux_abc123...',
  debug: true  // Shows console logs
};
```

---

## 🚨 Troubleshooting

### SDK Not Working?

1. **Check Browser Console** (F12 → Console)
   - Look for errors
   - Enable `debug: true` in SDK config

2. **Verify SDK Key**
   - Make sure key matches your project
   - Check project is "Active" in dashboard

3. **Check Network Tab** (F12 → Network)
   - Look for requests to `/api/events/ingest`
   - Check if they return 200 OK

4. **Verify Backend URL**
   - Make sure `apiUrl` points to correct backend
   - Check CORS is configured correctly

### No Data in Dashboard?

1. **Wait a few minutes** - Data may take time to appear
2. **Check project is Active** - Toggle it on in Projects page
3. **Verify SDK is installed** - Check browser console for SDK logs
4. **Check backend logs** - Look for errors in Vercel logs

---

## 📝 Example: Complete Integration

Here's a complete example for a simple HTML page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  
  <!-- UXCam Analytics SDK -->
  <!-- Load rrweb for visual session replay -->
  <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
  
  <!-- SDK Configuration -->
  <script>
    window.UXCamSDK = {
      key: 'ux_10d3d2f46073542c01af7803f62ffe79',
      apiUrl: 'https://ux-analytical-tool-gzsn.vercel.app',
      debug: false  // Set to true for debugging
    };
  </script>
  
  <!-- Load SDK -->
  <script src="https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js" async></script>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <button onclick="handlePurchase()">Buy Now</button>
  
  <script>
    // Track custom event
    function handlePurchase() {
      // Your purchase logic here
      console.log('Purchase completed');
      
      // Track the event
      if (window.UXCamSDK && window.UXCamSDK.trackEvent) {
        window.UXCamSDK.trackEvent('purchase_completed', {
          product: 'Premium Plan',
          price: 99.99
        });
      }
    }
  </script>
</body>
</html>
```

---

## 🎓 Summary

1. **Create a project** in the dashboard
2. **Copy the SDK code** from the Projects page
3. **Paste it in your website's `<head>`** section
4. **Deploy your website**
5. **View data** in the dashboard after users visit

The SDK automatically:
- ✅ Tracks all user interactions
- ✅ Records visual sessions
- ✅ Captures device/location info
- ✅ Sends data to your backend
- ✅ Works on any website (HTML, React, WordPress, etc.)

---

## 🔗 Important URLs

- **Frontend Dashboard**: `https://ux-analytical-tool-ochre.vercel.app`
- **Backend API**: `https://ux-analytical-tool-gzsn.vercel.app`
- **SDK File**: `https://ux-analytical-tool-ochre.vercel.app/uxcam-sdk-rrweb.js`

---

**Need Help?** Check the browser console for errors or enable `debug: true` in SDK config!
