# How to Create and Test Funnels

## Step 1: Create a Funnel in the Dashboard

1. **Open the Funnel Analysis Page**
   - Go to `http://localhost:5173/dashboard/funnels`
   - Make sure you have a project selected (top left)

2. **Click "+ Create Funnel"**
   - This opens the funnel builder

3. **Add Funnel Steps**
   - Click "+ Add Step" to add each step
   - For each step:
     - **Step Name**: Give it a descriptive name (e.g., "Homepage", "Signup Page", "Checkout")
     - **Condition Type**: Choose from:
       - **Page View**: Track when user visits a specific page/URL
       - **Event**: Track when a specific event occurs
       - **Custom**: Track custom conditions
     - **Additional Data (Optional)**:
       - **Key**: e.g., `url` for page views, `event_name` for events
       - **Value**: e.g., `/signup` for URL, `button_click` for event name

4. **Example Funnel Steps**:
   
   **Step 1: Homepage Visit**
   - Step Name: "Homepage"
   - Condition Type: "Page View"
   - Key: `url`
   - Value: `/` or `/home`

   **Step 2: Signup Page**
   - Step Name: "Signup Page"
   - Condition Type: "Page View"
   - Key: `url`
   - Value: `/signup`

   **Step 3: Signup Complete**
   - Step Name: "Signup Complete"
   - Condition Type: "Event"
   - Key: `event_name`
   - Value: `signup_completed`

5. **Save the Funnel**
   - Click "Save" for each step
   - Click "Create Funnel" at the bottom when done

## Step 2: Test the Funnel with Test Website

1. **Open the Test Website**
   - Open `http://localhost:5173/test-website.html` in your browser
   - Or copy `frontend/public/test-website.html` to your web server

2. **The Test Website Includes**:
   - Interactive buttons to test click events
   - Form submission tracking
   - Page navigation tracking
   - Real-time event logging

3. **Generate Events**:
   - Click buttons to generate click events
   - Fill and submit the form
   - Navigate between pages
   - All events are automatically tracked by the SDK

## Step 3: Analyze the Funnel

1. **Go Back to Dashboard**
   - Return to `http://localhost:5173/dashboard/funnels`

2. **Click "Analyze" on Your Funnel**
   - This will analyze the funnel based on recent session data
   - You'll see:
     - Conversion rates for each step
     - Drop-off rates
     - User counts at each step
     - Overall conversion rate

3. **View Results**:
   - The analysis shows how many users completed each step
   - You can see where users drop off
   - Conversion rates help identify bottlenecks

## Step 4: Create Test Pages for Your Funnel

To properly test a funnel, create simple HTML pages that match your funnel steps:

### Example: Signup Funnel

**page1.html** (Homepage):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Homepage</title>
    <script>
        window.UXCamSDK = {
            key: 'ux_10d3d2f46073542c01af7803f62ffe79',
            apiUrl: 'http://localhost/backend-php'
        };
    </script>
    <script src="http://localhost:5173/uxcam-sdk-rrweb.js" async></script>
</head>
<body>
    <h1>Welcome to Our Site</h1>
    <a href="page2.html">Go to Signup</a>
</body>
</html>
```

**page2.html** (Signup Page):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Signup</title>
    <script>
        window.UXCamSDK = {
            key: 'ux_10d3d2f46073542c01af7803f62ffe79',
            apiUrl: 'http://localhost/backend-php'
        };
    </script>
    <script src="http://localhost:5173/uxcam-sdk-rrweb.js" async></script>
</head>
<body>
    <h1>Sign Up</h1>
    <form onsubmit="handleSignup(event)">
        <input type="email" placeholder="Email" required>
        <input type="password" placeholder="Password" required>
        <button type="submit">Sign Up</button>
    </form>
    <script>
        function handleSignup(e) {
            e.preventDefault();
            // Track signup event
            if (window.UXCamSDK && window.UXCamSDK.track) {
                window.UXCamSDK.track('signup_completed', {
                    method: 'email'
                });
            }
            alert('Signup completed!');
        }
    </script>
</body>
</html>
```

## Quick Start Guide

1. **Create a simple 3-step funnel**:
   - Step 1: Homepage (Page View: `/`)
   - Step 2: Signup Page (Page View: `/signup`)
   - Step 3: Signup Complete (Event: `signup_completed`)

2. **Use the test website**:
   - Open `http://localhost:5173/test-website.html`
   - Interact with buttons and forms
   - Events will be tracked automatically

3. **Analyze the funnel**:
   - Go to dashboard
   - Click "Analyze" on your funnel
   - View conversion rates and drop-offs

## Troubleshooting

- **No data in funnel analysis**: Make sure you've generated events by using the test website
- **Events not tracking**: Check browser console for SDK errors
- **Backend errors**: Ensure backend is running at `http://localhost/backend-php`
- **SDK not loading**: Check that `http://localhost:5173/uxcam-sdk-rrweb.js` is accessible
