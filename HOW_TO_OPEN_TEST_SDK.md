# How to Open test-sdk.html

## File Location
```
C:\Users\AZEEM AHMAD\Downloads\uxcamm\test-sdk.html
```

---

## Method 1: Direct File Open (Easiest) ✅

1. **Navigate** to: `C:\Users\AZEEM AHMAD\Downloads\uxcamm\`
2. **Double-click** `test-sdk.html`
3. It will open in your default browser

---

## Method 2: Using File URL

Copy and paste this URL in your browser:
```
file:///C:/Users/AZEEM%20AHMAD/Downloads/uxcamm/test-sdk.html
```

Or (with spaces):
```
file:///C:/Users/AZEEM AHMAD/Downloads/uxcamm/test-sdk.html
```

---

## Method 3: Using Local Server (Recommended) ⭐

This is better because:
- Avoids CORS issues
- Better for testing SDK features
- Matches production environment

### Step 1: Start Frontend Server
```powershell
cd frontend
npm run dev
```

### Step 2: Open in Browser
```
http://localhost:5173/test-sdk.html
```

**Note**: Make sure `test-sdk.html` is in the `frontend/public/` folder for this to work.

---

## Method 4: Quick PowerShell Command

Run this in PowerShell:
```powershell
Start-Process "C:\Users\AZEEM AHMAD\Downloads\uxcamm\test-sdk.html"
```

---

## ⚠️ Important Notes

1. **SDK Script Loading**: The file tries to load SDK from:
   ```html
   <script src="http://localhost:5173/uxcam-sdk-rrweb.js"></script>
   ```
   
   This means:
   - If frontend server is NOT running, the SDK won't load
   - You need to start frontend server: `cd frontend && npm run dev`

2. **Backend Server**: Make sure backend is running:
   ```powershell
   cd backend
   npm run dev
   ```

---

## Quick Start Checklist

- [ ] Backend server running (`cd backend && npm run dev`)
- [ ] Frontend server running (`cd frontend && npm run dev`)
- [ ] Open `test-sdk.html` in browser
- [ ] Open Developer Tools (F12) → Console
- [ ] Interact with page to record session

---

## Troubleshooting

### SDK not loading?
- Make sure frontend server is running on port 5173
- Check browser console for errors
- Verify the SDK file exists: `frontend/public/uxcam-sdk-rrweb.js`

### CORS errors?
- Use Method 3 (local server) instead of direct file open
- Make sure backend CORS is configured for the frontend URL

---

**Easiest Way**: Just double-click the file! 🖱️

