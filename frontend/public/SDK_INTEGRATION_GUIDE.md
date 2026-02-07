# UXCam SDK Integration Guide

## How to Track ALL Pages (Homepage, Login, Signup, etc.)

The SDK **MUST** be included on **EVERY PAGE** of your website to track all user interactions.

### Step 1: Include SDK on ALL Pages

Add this code to **EVERY HTML page** (homepage, login, signup, dashboard, etc.):

```html
<!DOCTYPE html>
<html>
<head>
  <!-- ... your existing head content ... -->
  
  <!-- STEP 1: Load rrweb library -->
  <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
  
  <!-- STEP 2: Configure SDK (REQUIRED on EVERY page) -->
  <script>
    window.UXCamSDK = {
      key: 'YOUR_SDK_KEY_HERE',           // Replace with your actual SDK key
      apiUrl: 'https://your-api-url.com',  // Replace with your API URL
      debug: true  // Set to false in production
    };
  </script>
  
  <!-- STEP 3: Load the SDK script -->
  <script src="https://your-cdn-url.com/uxcam-sdk-rrweb.js"></script>
</head>
<body>
  <!-- Your page content -->
</body>
</html>
```

### Step 2: Example for Login Page

```html
<!-- login.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Login - Your Website</title>
  
  <!-- SDK Configuration (REQUIRED) -->
  <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
  <script>
    window.UXCamSDK = {
      key: 'ux_796d1942711ed206fdaa2a5e455fecdd',
      apiUrl: 'https://your-api-url.com',
      debug: true
    };
  </script>
  <script src="https://your-cdn-url.com/uxcam-sdk-rrweb.js"></script>
</head>
<body>
  <form>
    <input type="email" placeholder="Email">
    <input type="password" placeholder="Password">
    <button type="submit">Log In</button>
  </form>
</body>
</html>
```

### Step 3: Example for Signup Page

```html
<!-- signup.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Sign Up - Your Website</title>
  
  <!-- SDK Configuration (REQUIRED) -->
  <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
  <script>
    window.UXCamSDK = {
      key: 'ux_796d1942711ed206fdaa2a5e455fecdd',
      apiUrl: 'https://your-api-url.com',
      debug: true
    };
  </script>
  <script src="https://your-cdn-url.com/uxcam-sdk-rrweb.js"></script>
</head>
<body>
  <form>
    <input type="text" placeholder="Name">
    <input type="email" placeholder="Email">
    <input type="password" placeholder="Password">
    <button type="submit">Sign Up</button>
  </form>
</body>
</html>
```

### Step 4: For React/Next.js/SPA Applications

If you're using a Single Page Application (SPA), include the SDK in your main layout or `_app.js` / `App.js`:

```javascript
// _app.js (Next.js) or App.js (React)
import { useEffect } from 'react';
import Script from 'next/script'; // For Next.js

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Configure SDK (runs on every page/route)
    window.UXCamSDK = {
      key: 'ux_796d1942711ed206fdaa2a5e455fecdd',
      apiUrl: 'https://your-api-url.com',
      debug: true
    };
  }, []);

  return (
    <>
      {/* Load rrweb */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"
        strategy="beforeInteractive"
      />
      
      {/* Load SDK */}
      <Script 
        src="https://your-cdn-url.com/uxcam-sdk-rrweb.js"
        strategy="afterInteractive"
      />
      
      <Component {...pageProps} />
    </>
  );
}
```

### Step 5: For Server-Side Rendered Pages (PHP, Node.js, etc.)

Include the SDK in your base template/layout that all pages use:

```php
<!-- base-template.php -->
<!DOCTYPE html>
<html>
<head>
  <title><?php echo $pageTitle; ?></title>
  
  <!-- SDK - Included on ALL pages -->
  <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
  <script>
    window.UXCamSDK = {
      key: '<?php echo getenv("UXCAM_SDK_KEY"); ?>',
      apiUrl: '<?php echo getenv("UXCAM_API_URL"); ?>',
      debug: <?php echo getenv("APP_ENV") === "development" ? "true" : "false"; ?>
    };
  </script>
  <script src="https://your-cdn-url.com/uxcam-sdk-rrweb.js"></script>
</head>
<body>
  <?php include $content; ?>
</body>
</html>
```

## Important Notes

1. **EVERY PAGE MUST HAVE THE SDK**: Homepage, login, signup, dashboard, admin - ALL pages need the SDK script and configuration.

2. **Same Configuration on All Pages**: Use the same `key` and `apiUrl` on every page.

3. **Session Continuity**: The SDK automatically continues the same session across page navigations (homepage → login → signup).

4. **Check Browser Console**: After adding the SDK, check the browser console. You should see:
   - `UXCam SDK: Initializing on /login` (or whatever page you're on)
   - `UXCam SDK: ✓ Initialized` with session details

5. **If SDK Doesn't Load**: Check the console for errors. Common issues:
   - Missing `window.UXCamSDK.key` or `window.UXCamSDK.apiUrl`
   - SDK script not loading (check network tab)
   - CORS errors (ensure API URL is correct)

## Testing

1. Visit your homepage - check console for SDK logs
2. Navigate to `/login` - check console for SDK logs
3. Navigate to `/signup` - check console for SDK logs
4. All pages should show: `UXCam SDK: Initializing on [pathname]`

## Troubleshooting

**Problem**: SDK works on homepage but not on login page
**Solution**: Make sure the SDK script and configuration are included in the login page HTML

**Problem**: No SDK logs in console
**Solution**: 
- Check if `window.UXCamSDK` is defined: `console.log(window.UXCamSDK)`
- Check if SDK script loaded: Look in Network tab for `uxcam-sdk-rrweb.js`
- Check for JavaScript errors in console

**Problem**: "Configuration not found" error
**Solution**: Ensure `window.UXCamSDK.key` and `window.UXCamSDK.apiUrl` are set BEFORE the SDK script loads
