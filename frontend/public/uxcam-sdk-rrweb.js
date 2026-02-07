/**
 * UXCam Analytics SDK with rrweb DOM Recording
 * Records DOM snapshots for visual session replay
 * 
 * PRODUCTION-SAFE: All errors are caught and won't break your website
 * 
 * Integration:
 * <script>
 *   window.UXCamSDK = {
 *     key: 'YOUR_SDK_KEY',
 *     apiUrl: 'https://your-api.com' // Optional
 *   };
 * </script>
 * <script src="https://unpkg.com/rrweb@latest/dist/rrweb.min.js"></script>
 * <script src="uxcam-sdk-rrweb.js"></script>
 */

(function() {
  'use strict';

  // ============================================
  // GLOBAL ERROR HANDLER - Prevents SDK from breaking websites
  // ============================================
  var SDK_ERRORS = [];
  var MAX_ERRORS = 10; // Prevent error spam
  
  // Global error handler for matches() errors from rrweb
  var originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Catch "matches is not a function" errors and suppress them
    if (message && typeof message === 'string' && 
        (message.includes('matches is not a function') || 
         message.includes('.matches is not a function') ||
         message.includes('t.matches is not a function'))) {
      if (window.UXCamSDK && window.UXCamSDK.debug) {
        console.warn('UXCam SDK: Suppressed matches() error from rrweb:', message);
      }
      return true; // Suppress the error
    }
    
    // Call original error handler if it exists
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Also catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    var error = event.reason;
    var errorMessage = error && error.message ? error.message : String(error);
    
    // Suppress matches() errors in promises
    if (errorMessage && typeof errorMessage === 'string' && 
        (errorMessage.includes('matches is not a function') || 
         errorMessage.includes('.matches is not a function') ||
         errorMessage.includes('t.matches is not a function'))) {
      if (window.UXCamSDK && window.UXCamSDK.debug) {
        console.warn('UXCam SDK: Suppressed matches() error in promise:', errorMessage);
      }
      event.preventDefault(); // Suppress the error
      return;
    }
  });
  
  function safeExecute(fn, context, fallback, errorMessage) {
    try {
      return fn.call(context);
    } catch (error) {
      if (SDK_ERRORS.length < MAX_ERRORS) {
        SDK_ERRORS.push({
          error: error,
          message: errorMessage || 'SDK operation failed',
          timestamp: new Date().toISOString()
        });
      }
      
      // Only log in debug mode
      if (window.UXCamSDK && window.UXCamSDK.debug) {
        console.warn('UXCam SDK Error:', errorMessage || error.message, error);
      }
      
      return fallback !== undefined ? fallback : null;
    }
  }

  function safeAsyncExecute(fn, context, fallback, errorMessage) {
    try {
      var result = fn.call(context);
      if (result && typeof result.then === 'function') {
        return result.catch(function(error) {
          if (SDK_ERRORS.length < MAX_ERRORS) {
            SDK_ERRORS.push({
              error: error,
              message: errorMessage || 'SDK async operation failed',
              timestamp: new Date().toISOString()
            });
          }
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.warn('UXCam SDK Async Error:', errorMessage || error.message, error);
          }
          return fallback !== undefined ? fallback : null;
        });
      }
      return result;
    } catch (error) {
      if (SDK_ERRORS.length < MAX_ERRORS) {
        SDK_ERRORS.push({
          error: error,
          message: errorMessage || 'SDK async operation failed',
          timestamp: new Date().toISOString()
        });
      }
      if (window.UXCamSDK && window.UXCamSDK.debug) {
        console.warn('UXCam SDK Error:', errorMessage || error.message, error);
      }
      return fallback !== undefined ? fallback : null;
    }
  }

  // CRITICAL POLYFILL: Fix for "t.matches is not a function" and "Illegal invocation" errors
  // This prevents rrweb from crashing on elements that don't have matches()
  (function() {
    if (typeof Element === 'undefined') return;
    
    // Create a safe matches implementation
    var safeMatchesImpl = function(selector) {
      try {
        // Check if this is actually an Element
        if (!this || typeof this !== 'object') return false;
        if (!this.nodeType || this.nodeType !== 1) return false; // Not an Element node
        if (!this.ownerDocument) return false;
        
        // Use native matches if available
        if (Element.prototype.matches && this instanceof Element) {
          try {
            return Element.prototype.matches.call(this, selector);
          } catch (e) {
            // Fall through to fallback
          }
        }
        
        // Fallback: use querySelectorAll
        var matches = this.ownerDocument.querySelectorAll(selector);
        var i = matches.length;
        while (--i >= 0 && matches.item(i) !== this) {}
        return i > -1;
      } catch (e) {
        return false;
      }
    };
    
    // Apply polyfill to Element.prototype
    if (!Element.prototype.matches) {
      try {
        Object.defineProperty(Element.prototype, 'matches', {
          value: safeMatchesImpl,
          writable: true,
          enumerable: false,
          configurable: true
        });
      } catch (e) {
        Element.prototype.matches = safeMatchesImpl;
      }
    } else {
      // Wrap existing matches to handle edge cases
      var originalMatches = Element.prototype.matches;
      Element.prototype.matches = function(selector) {
        try {
          // Check if this is a valid Element
          if (!this || typeof this !== 'object' || !this.nodeType) {
            return false;
          }
          return originalMatches.call(this, selector);
        } catch (e) {
          // If original fails, try safe fallback
          if (e.message && (e.message.includes('Illegal invocation') || e.message.includes('not a function'))) {
            return safeMatchesImpl.call(this, selector);
          }
          // For other errors, return false to prevent crashes
          return false;
        }
      };
    }
    
    // Also add matches to Node.prototype for broader compatibility
    if (typeof Node !== 'undefined' && Node.prototype && !Node.prototype.matches) {
      Node.prototype.matches = function(selector) {
        // Only work for Element nodes
        if (this.nodeType === 1) {
          return Element.prototype.matches.call(this, selector);
        }
        return false;
      };
    }
  })();
  
  // Additional fix: Wrap JSON.stringify to prevent illegal invocation
  if (typeof JSON !== 'undefined' && JSON.stringify) {
    var originalStringify = JSON.stringify;
    JSON.stringify = function(value, replacer, space) {
      try {
        return originalStringify.call(this, value, replacer, space);
      } catch (e) {
        if (e.message && e.message.includes('Illegal invocation')) {
          // Fallback: use a safe stringify
          try {
            return originalStringify(value, function(key, val) {
              if (typeof val === 'function' || val === undefined) {
                return null;
              }
              if (typeof val === 'object' && val !== null) {
                // Check for circular references
                if (val === value || (replacer && replacer.call(this, key, val) === '[Circular]')) {
                  return '[Circular]';
                }
              }
              return replacer ? replacer.call(this, key, val) : val;
            }, space);
          } catch (e2) {
            console.warn('JSON.stringify fallback failed:', e2);
            return '{}';
          }
        }
        throw e;
      }
    };
  }

  // Wait for DOM to be ready before initializing
  function waitForDOMReady(callback) {
    if (document.readyState === 'complete') {
      callback();
    } else {
      window.addEventListener('load', callback, { once: true });
    }
  }

  // Wait for rrweb to be fully available - SIMPLIFIED: Only check window.rrweb
  function waitForRrweb(callback, maxRetries = 30, retryDelay = 100) {
    let retries = 0;
    
    function checkRrweb() {
      // SIMPLIFIED: Only check if window.rrweb exists (bundled version has everything)
      if (window.rrweb) {
        console.log('UXCam SDK: ✅ rrweb is loaded and ready', {
          hasRecord: typeof window.rrweb?.record === 'function',
          hasTakeFullSnapshot: typeof window.rrweb?.record?.takeFullSnapshot === 'function'
        });
        callback();
      } else if (retries < maxRetries) {
        retries++;
        if (retries % 5 === 0) { // Log every 5 attempts to avoid spam
          console.log(`UXCam SDK: Waiting for rrweb... (attempt ${retries}/${maxRetries})`);
        }
        setTimeout(checkRrweb, retryDelay);
      } else {
        console.error('UXCam SDK: ❌ rrweb failed to load after maximum retries');
        // Try to load it manually as fallback
        loadRrwebManually(callback);
      }
    }
    
    checkRrweb();
  }

  // Load rrweb manually if not already loaded - SIMPLIFIED: Use bundled version
  function loadRrwebManually(callback) {
    if (window.rrweb) {
      callback();
      return;
    }

    console.log('UXCam SDK: Loading bundled rrweb from CDN...');
    const head = document.head || document.getElementsByTagName('head')[0];
    
    // Load bundled rrweb-all.min.js (contains everything)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb-all.min.js';
    script.async = false;
    script.defer = false;
    
    script.onload = function() {
      console.log('UXCam SDK: Bundled rrweb script loaded, verifying...');
      // Wait a bit for rrweb to fully initialize
      setTimeout(() => {
        waitForRrweb(callback);
      }, 200);
    };
    
    script.onerror = function() {
      console.error('UXCam SDK: ❌ Failed to load bundled rrweb from CDN');
    };
    
    // Insert script in head
    head.insertBefore(script, head.firstChild);
  }

  // Initialize SDK only when both DOM and rrweb are ready
  function initSDK() {
    // Auto-detect API URL: Use provided apiUrl, or try to detect from current page
    function getApiUrl() {
      if (window.UXCamSDK?.apiUrl) {
        return window.UXCamSDK.apiUrl;
      }
      
      // In production, try to infer from current page origin
      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        // If not localhost, assume backend is on same domain or subdomain
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.')) {
          // Try same origin with /api prefix, or common backend patterns
          return window.location.origin.replace(/\/$/, '');
        }
      }
      
      // Fallback to localhost for development
      return 'http://localhost:3001';
    }
    
    // Configuration
    const apiUrl = getApiUrl();
    const config = {
      apiUrl: apiUrl,
      sdkKey: window.UXCamSDK?.key || '',
      batchSize: 10000, // Very large batch - we'll flush all on page unload
      flushInterval: 0, // Disabled - we only flush on page unload
      // IMPORTANT: Type 2 is sent immediately, incremental events are batched until page unload
      flushFirstEventImmediately: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      snapshotInterval: 5000, // Take snapshot every 5 seconds
      checkoutInterval: 10000, // Take full snapshot every 10 seconds
      flushOnUnload: true, // Flush all snapshots when user leaves
    };
    
    // Storage & Performance Limits
    const MAX_QUEUE_SIZE = 50000; // Maximum events/snapshots in memory (prevent memory bloat)
    const MAX_SNAPSHOT_QUEUE_SIZE = 10000; // Maximum snapshots in queue
    const MAX_EVENT_QUEUE_SIZE = 5000; // Maximum events in queue
    const WARN_QUEUE_SIZE = 1000; // Warn when queue reaches this size
    const MAX_UPLOAD_RETRIES = 3; // Maximum retry attempts for failed uploads
    
    // Log configuration for debugging
    console.log('UXCam SDK: Configuration loaded', {
      apiUrl: config.apiUrl,
      sdkKey: config.sdkKey ? config.sdkKey.substring(0, 10) + '...' : 'NOT SET',
      windowUXCamSDK: window.UXCamSDK ? {
        hasKey: !!window.UXCamSDK.key,
        hasApiUrl: !!window.UXCamSDK.apiUrl,
        apiUrl: window.UXCamSDK.apiUrl
      } : 'NOT SET'
    });

    // State
    let sessionId = null;
    let sessionStartTime = null;
    let recordingStartTime = null; // Track when recording actually starts (Type 2 uploaded)
    let eventQueue = [];
    let snapshotQueue = [];
    let flushTimer = null;
    let lastActivityTime = Date.now();
    let deviceInfo = null;
    let stopRecording = null;
    let events = [];
    // CRITICAL: type2Uploaded must be at module scope so flushSnapshots() can access it
    let type2Uploaded = false;

    // Initialize device info
    function initDeviceInfo() {
      try {
        // Safely access navigator properties
        const getCookieEnabled = () => {
          try {
            return navigator.cookieEnabled !== undefined ? navigator.cookieEnabled : false;
          } catch (e) {
            return false;
          }
        };
        
        const getOnline = () => {
          try {
            return navigator.onLine !== undefined ? navigator.onLine : true;
          } catch (e) {
            return true;
          }
        };
        
        const getTimezone = () => {
          try {
            if (Intl && Intl.DateTimeFormat) {
              return Intl.DateTimeFormat().resolvedOptions().timeZone;
            }
            return 'UTC';
          } catch (e) {
            return 'UTC';
          }
        };
        
        // Extract region from timezone for geographic data
        let region = null;
        let city = null;
        let country = null;
        try {
          const timezone = getTimezone();
          if (timezone) {
            const parts = timezone.split('/');
            if (parts.length > 0) {
              region = parts[0];
              // Try to extract city from timezone (e.g., "America/New_York" -> "New York")
              if (parts.length > 1) {
                city = parts[1].replace(/_/g, ' ');
                // Map common regions to countries
                var regionToCountryMap = {
                  'America': 'US',
                  'Europe': 'EU',
                  'Asia': 'AS',
                  'Africa': 'AF',
                  'Australia': 'AU',
                  'Pacific': 'OC',
                  'Atlantic': 'AT',
                  'Indian': 'IN'
                };
                country = regionToCountryMap[parts[0]] || parts[0] || 'Unknown';
              }
            }
          }
        } catch (e) {
          // Ignore
        }
        
        // Initialize deviceInfo with timezone-based location first
        deviceInfo = {
          userAgent: (navigator && navigator.userAgent) ? navigator.userAgent : 'unknown',
          platform: 'web', // Explicitly set to 'web' for web SDK
          osPlatform: (navigator && navigator.platform) ? navigator.platform : 'unknown', // Store OS platform separately
          language: (navigator && navigator.language) ? navigator.language : 'en',
          screenWidth: (window && window.screen && window.screen.width) ? window.screen.width : 0,
          screenHeight: (window && window.screen && window.screen.height) ? window.screen.height : 0,
          viewportWidth: (window && window.innerWidth) ? window.innerWidth : 0,
          viewportHeight: (window && window.innerHeight) ? window.innerHeight : 0,
          timezone: getTimezone(),
          cookieEnabled: getCookieEnabled(),
          online: getOnline(),
          region: region,
          city: city,
          country: country,
        };
        
        // Try to get geolocation (with user permission) - async, backend will use IP as fallback
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Success - update deviceInfo with coordinates
              // Note: This happens async, so backend IP geolocation will be primary source
              deviceInfo.latitude = position.coords.latitude;
              deviceInfo.longitude = position.coords.longitude;
              if (window.UXCamSDK && window.UXCamSDK.debug) {
                console.log('UXCam SDK: Geolocation obtained:', { lat: deviceInfo.latitude, lng: deviceInfo.longitude });
              }
            },
            (error) => {
              // User denied, timeout, or error - backend will use IP-based geolocation
              // This is normal - browser geolocation requires explicit permission
              // IP-based geolocation will still work and provide location data
              if (window.UXCamSDK && window.UXCamSDK.debug) {
                const errorMsg = error.code === 1 ? 'permission denied' : 
                               error.code === 2 ? 'position unavailable' : 
                               error.code === 3 ? 'timeout' : 'unknown error';
                console.log(`UXCam SDK: Browser geolocation ${errorMsg} (this is normal). IP-based geolocation will be used instead.`);
              }
            },
            { timeout: 3000, maximumAge: 60000, enableHighAccuracy: false }
          );
        }
      } catch (error) {
        console.error('UXCam SDK: Error initializing device info:', error);
        // Fallback device info
        deviceInfo = {
          userAgent: 'unknown',
          platform: 'web', // Explicitly set to 'web' for web SDK
          osPlatform: 'unknown',
          language: 'en',
          screenWidth: 0,
          screenHeight: 0,
          viewportWidth: 0,
          viewportHeight: 0,
          timezone: 'UTC',
          cookieEnabled: false,
          online: true,
        };
      }
    }

    // Generate session ID
    function generateSessionId() {
      // Check if we have a valid session ID in localStorage (persist across page refreshes)
      const STORAGE_KEY = 'uxcam_session_id';
      const STORAGE_TIMESTAMP_KEY = 'uxcam_session_timestamp';
      const STORAGE_URL_KEY = 'uxcam_last_url';
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
      
      const currentUrl = window.location.href;
      let isNavigation = false;
      let reusedSessionId = null;
      
      console.log('UXCam SDK: 🔍 generateSessionId() called, checking localStorage...', {
        currentUrl: currentUrl,
        hasLocalStorage: typeof localStorage !== 'undefined'
      });
      
      try {
        const storedSessionId = localStorage.getItem(STORAGE_KEY);
        const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
        const storedUrl = localStorage.getItem(STORAGE_URL_KEY);
        
        console.log('UXCam SDK: 📦 localStorage check result:', {
          hasStoredSessionId: !!storedSessionId,
          storedSessionId: storedSessionId,
          hasStoredTimestamp: !!storedTimestamp,
          storedTimestamp: storedTimestamp,
          storedUrl: storedUrl
        });
        
        if (storedSessionId && storedTimestamp) {
          const sessionAge = Date.now() - parseInt(storedTimestamp, 10);
          console.log('UXCam SDK: ⏱️ Session age check:', {
            sessionAge: sessionAge,
            sessionAgeSeconds: Math.round(sessionAge / 1000),
            timeout: SESSION_TIMEOUT,
            isWithinTimeout: sessionAge < SESSION_TIMEOUT
          });
          
          // Reuse session if it's less than 30 minutes old
          if (sessionAge < SESSION_TIMEOUT) {
            console.log('UXCam SDK: ✅ Reusing existing session for continuous recording', {
              sessionId: storedSessionId,
              sessionAge: Math.round(sessionAge / 1000) + 's',
              previousUrl: storedUrl,
              currentUrl: currentUrl
            });
            reusedSessionId = storedSessionId;
            
            // Check if URL changed (navigation detected) - works for ANY page change
            // This detects navigation from ANY page to ANY other page, regardless of page type
            if (storedUrl && storedUrl !== currentUrl) {
              isNavigation = true;
              console.log('UXCam SDK: 🔄 Page navigation detected - continuing same session', {
                from: storedUrl,
                to: currentUrl,
                sessionId: storedSessionId,
                note: 'Navigation works for ANY page change (homepage, login, signup, or any other page)'
              });
            } else if (!storedUrl) {
              // First page visit - no previous URL stored
              console.log('UXCam SDK: First page visit - starting new session', {
                url: currentUrl,
                sessionId: storedSessionId,
                note: 'Session will continue across all subsequent page navigations'
              });
            } else {
              // Same page (refresh or no navigation)
              console.log('UXCam SDK: Same page - continuing session', {
                url: currentUrl,
                sessionId: storedSessionId
              });
            }
          } else {
            // Session expired, clear it
            console.log('UXCam SDK: ⏰ Session expired, clearing localStorage', {
              sessionAge: Math.round(sessionAge / 1000) + 's',
              timeout: Math.round(SESSION_TIMEOUT / 1000) + 's'
            });
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
            localStorage.removeItem(STORAGE_URL_KEY);
          }
        } else {
          console.log('UXCam SDK: 📝 No existing session in localStorage, will create new one');
        }
      } catch (e) {
        // localStorage not available, continue with new session
        console.warn('UXCam SDK: ⚠️ localStorage not available, creating new session', e);
      }
      
      // Generate new session ID if not reusing
      const sessionId = reusedSessionId || ('sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
      
      console.log('UXCam SDK: 🎯 Final session ID decision:', {
        reused: !!reusedSessionId,
        sessionId: sessionId,
        isNew: !reusedSessionId
      });
      
      // Store in localStorage IMMEDIATELY
      try {
        localStorage.setItem(STORAGE_KEY, sessionId);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(STORAGE_URL_KEY, currentUrl);
        console.log('UXCam SDK: 💾 Stored session ID in localStorage:', {
          sessionId: sessionId,
          url: currentUrl,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('UXCam SDK: ❌ Failed to store session ID in localStorage:', e);
      }
      
      // Store navigation flag for later use
      if (isNavigation) {
        window.__UXCAM_NAVIGATION_DETECTED = true;
        window.__UXCAM_NAVIGATION_FROM_URL = storedUrl;
      }
      
      return sessionId;
    }

    // ============================================
    // CLEAN SESSION RECORDING - STEP BY STEP
    // ============================================
    // Wait for all CSS stylesheets to load
    async function waitForCSS() {
      const stylesheets = Array.from(document.styleSheets);
      const promises = [];
      
      for (let i = 0; i < stylesheets.length; i++) {
        try {
          const sheet = stylesheets[i];
          // Check if stylesheet is from same origin or CORS-enabled
          if (sheet.href) {
            // External stylesheet - wait for it to load
            if (sheet.cssRules || sheet.rules) {
              // Already loaded
              continue;
            } else {
              // Wait for stylesheet to load
              const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                .find(link => link.href === sheet.href);
              if (link) {
                promises.push(new Promise(resolve => {
                  if (link.sheet && link.sheet.cssRules) {
                    resolve(); // Already loaded
                  } else {
                    link.onload = resolve;
                    link.onerror = resolve; // Continue even if CSS fails
                    // Timeout after 3 seconds
                    setTimeout(resolve, 3000);
                  }
                }));
              }
            }
          }
        } catch (e) {
          // CORS error or other issue - continue
          continue;
        }
      }
      
      // Wait for all stylesheets or timeout
      await Promise.all(promises);
      
      // Additional delay to ensure styles are computed
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    async function startRecording() {
      // Step 1: Basic validation
      if (!window.rrweb) {
        console.error('UXCam SDK: rrweb not available');
        return;
      }
      if (!sessionId) {
        console.warn('UXCam SDK: No session ID');
        return;
      }

      // Step 2: Wait for DOM ready
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          if (document.readyState === 'complete') resolve();
          else window.addEventListener('load', resolve, { once: true });
        });
      }
      
      // Step 3: Wait for CSS to load (CRITICAL for proper styling)
      console.log('UXCam SDK: Waiting for CSS stylesheets to load...');
      await waitForCSS();
      console.log('UXCam SDK: CSS stylesheets loaded');
      
      // Step 4: Additional delay for browser paint and style computation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Initialize recording state
      type2Uploaded = false;
      let capturedType2 = null;
      let type2Resolve = null;
      const type2Promise = new Promise(resolve => { type2Resolve = resolve; });
      
      // Step 5.5: Record navigation event (Type 4 Meta) if navigation detected
      if (window.__UXCAM_NAVIGATION_DETECTED) {
        const fromUrl = window.__UXCAM_NAVIGATION_FROM_URL || '';
        const toUrl = window.location.href;
        
        // Check for pending navigation from beforeunload
        const pendingNav = window.__UXCAM_PENDING_NAVIGATION;
        const finalFromUrl = pendingNav?.from || fromUrl;
        const finalToUrl = pendingNav?.to || toUrl;
        
        // Create Type 4 Meta event for navigation
        const navigationEvent = {
          type: 4, // Meta event type
          data: {
            href: finalToUrl,
            url: finalToUrl,
            referrer: finalFromUrl,
            width: window.innerWidth,
            height: window.innerHeight
          },
          timestamp: pendingNav?.timestamp || Date.now()
        };
        
        // Add navigation event to queue BEFORE Type 2 snapshot
        snapshotQueue.push(navigationEvent);
        events.push(navigationEvent);
        console.log('UXCam SDK: 📍 Navigation event recorded', {
          from: finalFromUrl,
          to: finalToUrl,
          eventType: 4,
          source: pendingNav ? 'beforeunload' : 'session-continuation',
          sessionId: sessionId
        });
        
        // Clear navigation flags
        delete window.__UXCAM_NAVIGATION_DETECTED;
        delete window.__UXCAM_NAVIGATION_FROM_URL;
        delete window.__UXCAM_PENDING_NAVIGATION;
      }
      
      // Step 6: Start rrweb recording engine
      console.log('UXCam SDK: Starting rrweb recording...');
      stopRecording = window.rrweb.record({
        emit(event) {
          // Wrap in try-catch to prevent errors from breaking the website
          try {
            // Capture first Type 2 event
            if (event.type === 2 && !capturedType2) {
              capturedType2 = event;
              events.push(event);
              if (type2Resolve) type2Resolve(event);
              return; // Don't add to queue, will upload separately
            }
            
            // Block incremental events until Type 2 uploaded
            if (!type2Uploaded && event.type !== 2) {
              return;
            }
            
            // Track activity when events are emitted
            trackActivity();
            
            // Process all events (including periodic full snapshots)
            events.push(event);
            
            // Storage management: Prevent queue from growing too large
            if (snapshotQueue.length >= MAX_SNAPSHOT_QUEUE_SIZE) {
              console.warn('UXCam SDK: ⚠️ Snapshot queue too large, forcing flush to prevent memory bloat', {
                queueSize: snapshotQueue.length,
                maxSize: MAX_SNAPSHOT_QUEUE_SIZE
              });
              // Remove oldest snapshots if queue is too large (keep most recent)
              const excess = snapshotQueue.length - MAX_SNAPSHOT_QUEUE_SIZE;
              snapshotQueue.splice(0, excess);
              console.warn(`UXCam SDK: Removed ${excess} oldest snapshots to prevent memory bloat`);
              // Force flush to free memory
              flushSnapshots();
            } else if (snapshotQueue.length >= WARN_QUEUE_SIZE) {
              console.warn('UXCam SDK: ⚠️ Snapshot queue growing large', {
                queueSize: snapshotQueue.length,
                warningThreshold: WARN_QUEUE_SIZE
              });
            }
            
            snapshotQueue.push(event);
            
            // Flush snapshots only when batch size is reached
            // Don't flush periodically - only flush on page unload/visibility change (UXCam style)
            if (snapshotQueue.length >= config.batchSize) {
              console.log('UXCam SDK: Snapshot queue reached batch size, flushing');
              flushSnapshots();
            }
            // Removed periodic 5-second flush - snapshots will be flushed on page unload
          } catch (error) {
            // Silently catch errors from rrweb to prevent breaking the website
            if (window.UXCamSDK && window.UXCamSDK.debug) {
              console.warn('UXCam SDK: Error in rrweb emit:', error);
            }
            // Don't rethrow - allow website to continue functioning
          }
        },
        maskAllInputs: true,
        maskAllText: false, // Don't mask text to capture full content
        recordCanvas: true,
        recordCrossOriginIframes: false,
        // Enable cursor recording - this ensures mouse cursor is visible in replay
        recordCursor: true, // Explicitly enable cursor recording
        // Take full snapshots periodically for larger, more complete recordings
        // Note: checkoutEveryNms may not be available in all rrweb versions
        // The larger batch size and slower flush will naturally create larger snapshots
        // Capture all user interactions at realistic speeds
        sampling: {
          scroll: 300, // Record scroll every 300ms (slower, more realistic - matches user interaction timing)
          input: 'last', // Record last input value (captures all inputs)
          mouseInteraction: true, // Record all mouse interactions (clicks, moves)
        },
        // Record all DOM mutations and user interactions
        blockClass: 'rr-block',
        blockSelector: '[data-rr-block]',
        ignoreClass: 'rr-ignore',
        // Record all events for complete session replay
        recordAfter: 'DOMContentLoaded',
      });
      
      // Step 7: Wait for Type 2 event (rrweb emits it automatically)
      try {
        const type2Event = await Promise.race([
          type2Promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        // Step 8: Validate Type 2 snapshot
        // Don't modify the snapshot - rrweb handles it correctly
        // Just validate it has data
        if (!type2Event.data) {
          throw new Error('Invalid snapshot structure - no data');
        }
        
        // Log snapshot info (don't stringify the whole thing - it might have circular refs)
        try {
          // Try to estimate size without full stringify (to avoid illegal invocation)
          let estimatedSize = 0;
          try {
            const snapshotStr = JSON.stringify(type2Event, function(key, value) {
              if (typeof value === 'function' || value === undefined) return null;
              if (typeof value === 'object' && value !== null) {
                if (value.nodeType !== undefined) return '[DOM Node]';
                if (value.ownerDocument !== undefined) return '[DOM Element]';
              }
              return value;
            });
            estimatedSize = snapshotStr.length;
          } catch (e) {
            // If stringify fails, estimate from data structure
            estimatedSize = type2Event.data ? 
              (type2Event.data.childNodes ? type2Event.data.childNodes.length * 100 : 1000) : 
              100;
          }
          
          console.log('UXCam SDK: Type 2 snapshot captured', {
            size: estimatedSize,
            sizeKB: (estimatedSize / 1024).toFixed(2) + 'kB',
            hasData: !!type2Event.data,
            type: type2Event.type,
            hasChildNodes: type2Event.data?.childNodes ? type2Event.data.childNodes.length : 0
          });
          
          // Only reject if completely empty
          if (estimatedSize < 100) {
            throw new Error(`Snapshot too small: ${estimatedSize} bytes`);
          }
        } catch (stringifyError) {
          // If stringify fails (circular refs), that's OK - rrweb handles it
          console.log('UXCam SDK: Type 2 snapshot captured (size check skipped)', {
            hasData: !!type2Event.data,
            type: type2Event.type
          });
        }
        
        // Step 9: Upload Type 2 immediately (include navigation event if present)
        console.log('UXCam SDK: Uploading Type 2 snapshot...');
        
        // Check if there's a navigation event in the queue (should be first)
        const eventsToUpload = [];
        if (snapshotQueue.length > 0 && snapshotQueue[0].type === 4) {
          // Include navigation event before Type 2
          eventsToUpload.push(snapshotQueue.shift()); // Remove from queue
          console.log('UXCam SDK: Including navigation event with Type 2 snapshot');
        }
        eventsToUpload.push(type2Event);
        
        const compressed = compressSnapshots(eventsToUpload);
        
        // Log compression info
        console.log('UXCam SDK: Compression info', {
          compressedType: typeof compressed,
          compressedLength: typeof compressed === 'string' ? compressed.length : 'N/A',
          eventsCount: eventsToUpload.length,
          hasNavigation: eventsToUpload.some(e => e.type === 4)
        });
        
        // Log session ID being used for upload
        console.log('UXCam SDK: 📤 Uploading Type 2 snapshot with session ID:', {
          sessionId: sessionId,
          sessionIdLength: sessionId?.length,
          url: window.location.href,
          hasNavigation: eventsToUpload.some(e => e.type === 4),
          eventsCount: eventsToUpload.length
        });
        
        const response = await fetch(`${config.apiUrl}/api/snapshots/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdk_key: config.sdkKey,
            session_id: sessionId,
            snapshots: compressed,
            snapshot_count: eventsToUpload.length,
            is_initial_snapshot: true
          })
        });
        
        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = `Upload failed: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('UXCam SDK: Server error details:', errorData);
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        // Log success
        const responseData = await response.json().catch(() => ({}));
        console.log('UXCam SDK: ✅ Type 2 upload successful', responseData);
        
        // Store session DB ID and project ID from response
        if (responseData.session_id && !sessionDbId) {
          sessionDbId = responseData.session_id;
        }
        if (responseData.project_id && !projectId) {
          projectId = responseData.project_id;
        }
        
        // Step 10: Enable incremental events
        type2Uploaded = true;
        
        // Mark recording start time (when Type 2 is successfully uploaded)
        // This is the actual start of recording, not when session was initialized
        if (!recordingStartTime) {
          recordingStartTime = Date.now();
          // Track session_start event only AFTER recording actually starts
          trackEvent('session_start', {
            timestamp: new Date().toISOString(),
            recording_started: true
          });
          
          // Start periodic flushing now that recording has started
          // Removed: scheduleSnapshotFlush() - no periodic flushing, only on page unload
        }
        
        console.log('UXCam SDK: ✅ Type 2 uploaded, recording active');
        console.log('UXCam SDK: Snapshots will be flushed on page unload/visibility change (UXCam-style behavior)');
        
      } catch (error) {
        console.error('UXCam SDK: Type 2 failed:', error.message);
        // Keep type2Uploaded = false to block events
      }
    }
    
    // OLD FUNCTION REMOVED - Incremental recording is now integrated into startRecording()
    // The emit function in startRecording() handles incremental events after type2Uploaded flag is set

    // Start new session - SAFE: Won't break website if it fails
    function startSession() {
      return safeExecute(function() {
        // CRITICAL: Check localStorage FIRST before generating new session ID
        // This ensures we reuse the same session across page navigations
        const STORAGE_KEY = 'uxcam_session_id';
        const STORAGE_TIMESTAMP_KEY = 'uxcam_session_timestamp';
        const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        
        let existingSessionId = null;
        try {
          const storedSessionId = localStorage.getItem(STORAGE_KEY);
          const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
          
          if (storedSessionId && storedTimestamp) {
            const sessionAge = Date.now() - parseInt(storedTimestamp, 10);
            if (sessionAge < SESSION_TIMEOUT) {
              existingSessionId = storedSessionId;
              console.log('UXCam SDK: 🔍 Found existing session in localStorage', {
                sessionId: existingSessionId,
                age: Math.round(sessionAge / 1000) + 's',
                url: window.location.href
              });
            }
          }
        } catch (e) {
          console.warn('UXCam SDK: Could not read localStorage:', e);
        }
        
        const previousSessionId = sessionId;
        sessionId = existingSessionId || generateSessionId();
        
        // Check if this is a continuation of an existing session (page navigation)
        const isSessionContinuation = (previousSessionId && previousSessionId === sessionId) || 
                                      (existingSessionId && existingSessionId === sessionId);
        
        if (isSessionContinuation) {
          console.log('UXCam SDK: 🔄 Continuing existing session across page navigation', {
            sessionId: sessionId,
            previousUrl: window.__UXCAM_NAVIGATION_FROM_URL || 'unknown',
            currentUrl: window.location.href,
            wasInMemory: !!previousSessionId,
            wasInStorage: !!existingSessionId
          });
          // Don't reset events array - we want to continue the timeline
          // The events from previous page are already uploaded
          // Don't reset sessionStartTime - keep the original start time
        } else {
          console.log('UXCam SDK: 🆕 Starting new session', {
            sessionId: sessionId,
            url: window.location.href,
            previousSessionId: previousSessionId || 'none'
          });
          // Reset events array only for truly new sessions
          events = [];
          sessionStartTime = Date.now();
        }
        
        lastActivityTime = Date.now();
        
        // Setup activity tracking
        setupActivityTracking();
        
        // Setup form field tracking
        setupFormFieldTracking();
        
        // CRITICAL: If this is a navigation (different page), record navigation event FIRST
        // This must happen BEFORE starting recording to ensure navigation is captured
        if (isSessionContinuation && window.__UXCAM_NAVIGATION_DETECTED) {
          const fromUrl = window.__UXCAM_NAVIGATION_FROM_URL || 'unknown';
          const toUrl = window.location.href;
          
          console.log('UXCam SDK: 🔄 Recording navigation event before starting recording', {
            from: fromUrl,
            to: toUrl,
            sessionId: sessionId
          });
          
          // Store navigation info to be recorded when recording starts
          window.__UXCAM_PENDING_NAVIGATION = {
            from: fromUrl,
            to: toUrl,
            timestamp: Date.now()
          };
        }
        
        // Start DOM recording (async, won't block)
        // This will record navigation event + new Type 2 snapshot if navigation detected
        safeAsyncExecute(function() {
          startRecording();
        }, null, null, 'startRecording failed');
        
        // Reset inactivity timer
        resetInactivityTimer();
        
        // DON'T track session_start here - wait until recording actually starts (Type 2 uploaded)
        // This prevents events from being sent before recording starts
      }, null, null, 'startSession failed');
    }

    // Track event - SAFE: Won't break website if it fails
    function trackEvent(type, data = {}) {
      return safeExecute(function() {
        if (!config.sdkKey) {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.warn('UXCam SDK: SDK key not configured');
          }
          return;
        }

        if (!sessionId) {
          startSession();
        }
        
        // Block events until recording starts (Type 2 uploaded) - except session_start and network events
        // Network events are useful even before recording starts (for debugging)
        // This prevents most events from being sent before recording actually starts
        if (!type2Uploaded && type !== 'session_start' && type !== 'network_request' && type !== 'network_response') {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.log('UXCam SDK: Event blocked - recording not started yet:', type);
          }
          return;
        }

        const event = {
          type,
          timestamp: new Date().toISOString(),
          data: {
            ...data,
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
          }
        };

        // Storage management: Prevent event queue from growing too large
        if (eventQueue.length >= MAX_EVENT_QUEUE_SIZE) {
          console.warn('UXCam SDK: ⚠️ Event queue too large, forcing flush to prevent memory bloat', {
            queueSize: eventQueue.length,
            maxSize: MAX_EVENT_QUEUE_SIZE
          });
          // Force flush to free memory
          flushEvents();
        } else if (eventQueue.length >= WARN_QUEUE_SIZE) {
          console.warn('UXCam SDK: ⚠️ Event queue growing large', {
            queueSize: eventQueue.length,
            warningThreshold: WARN_QUEUE_SIZE
          });
        }
        
        eventQueue.push(event);
        lastActivityTime = Date.now();

        // Flush if batch size reached
        if (eventQueue.length >= config.batchSize) {
          flushEvents();
        } else {
          scheduleFlush();
        }
      }, null, null, 'trackEvent failed');
    }

    // Compress snapshot data
    function compressSnapshots(snapshots) {
      try {
        // First, safely stringify the snapshots
        // Use a replacer function to handle circular references
        const safeStringify = (obj) => {
          const seen = new WeakSet();
          return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
            }
            // Remove any functions or undefined values
            if (typeof value === 'function' || value === undefined) {
              return null;
            }
            return value;
          });
        };
        
        const jsonString = safeStringify(snapshots);
        
        // CRITICAL: Send uncompressed JSON to ensure PHP backend can parse it
        // PHP backend doesn't have LZString decompression, so we must send plain JSON
        // Compression can be added later if needed with a PHP LZString library
        return jsonString;
      } catch (error) {
        console.error('UXCam SDK: Compression failed', error);
        // Fallback: try basic stringify
        try {
          return JSON.stringify(snapshots);
        } catch (fallbackError) {
          console.error('UXCam SDK: Fallback stringify also failed', fallbackError);
          // Last resort: send minimal data
          return JSON.stringify(snapshots.map(s => ({ type: s.type, timestamp: s.timestamp })));
        }
      }
    }

    // Flush snapshots to server - SAFE: Won't break website if it fails
    function flushSnapshots() {
      return safeAsyncExecute(function() {
        if (snapshotQueue.length === 0 || !sessionId) {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.warn('UXCam SDK: Cannot flush snapshots', {
              queueLength: snapshotQueue.length,
              sessionId: sessionId
            });
          }
          return;
        }

      // PRIORITY CHECK: Do not send incremental events if Type 2 hasn't been uploaded yet
      // This ensures the first ingest call contains Type 2
      const hasType2InQueue = snapshotQueue.some(s => s && s.type === 2);
      if (!type2Uploaded && !hasType2InQueue) {
        console.log('UXCam SDK: Blocking snapshot flush - waiting for Type 2 to be uploaded first');
        return; // Don't send incremental events until Type 2 is uploaded
      }

      const snapshots = snapshotQueue.splice(0, config.batchSize);
      
      // VALIDATE snapshots before sending - filter out only truly invalid ones
      // REMOVED: Size restrictions - let all valid snapshots through for complete recording
      const validSnapshots = snapshots.filter(snapshot => {
        if (!snapshot || snapshot.data === undefined) {
          console.warn('UXCam SDK: Filtering out invalid snapshot (missing data)', snapshot);
          return false;
        }
        
        // For type 2 snapshots, ensure they have structure
        if (snapshot.type === 2) {
          // Check if it has childNodes or is a valid DOM structure
          if (!snapshot.data || (typeof snapshot.data === 'object' && !snapshot.data.childNodes && !snapshot.data.node)) {
            console.warn('UXCam SDK: Filtering out type 2 snapshot (invalid structure)', snapshot);
            return false;
          }
        } else {
          // Type 3+ events (incremental) - just check they have data
          if (!snapshot.data || (typeof snapshot.data === 'object' && Object.keys(snapshot.data).length === 0)) {
            console.warn('UXCam SDK: Filtering out incremental event (empty data)', snapshot);
            return false;
          }
        }
        
        return true;
      });
      
      if (validSnapshots.length === 0) {
        console.warn('UXCam SDK: No valid snapshots to flush after validation');
        return;
      }
      
      if (validSnapshots.length < snapshots.length) {
        console.log(`UXCam SDK: Filtered ${snapshots.length - validSnapshots.length} invalid snapshots`);
      }
      
      const hasType2 = validSnapshots.some(s => s.type === 2);
      const payloadSize = JSON.stringify(validSnapshots).length;
      
      console.log('UXCam SDK: Flushing validated snapshots', {
        originalCount: snapshots.length,
        validCount: validSnapshots.length,
        types: validSnapshots.map(s => s.type),
        hasType2: hasType2,
        firstType: validSnapshots[0]?.type,
        firstTimestamp: validSnapshots[0]?.timestamp,
        payloadSize: payloadSize,
        payloadSizeKB: (payloadSize / 1024).toFixed(2) + 'kB'
      });
      
      if (hasType2) {
        const type2Size = JSON.stringify(validSnapshots.find(s => s.type === 2)).length;
        console.log('UXCam SDK: ⚠️ Type 2 included in flush (should have been sent separately)', {
          type2Size: type2Size,
          type2SizeKB: (type2Size / 1024).toFixed(2) + 'kB'
        });
      }
      
      const compressed = compressSnapshots(validSnapshots);
      
      // Log session ID being used for incremental snapshots
      console.log('UXCam SDK: 📤 Uploading incremental snapshots with session ID:', {
        sessionId: sessionId,
        snapshotCount: validSnapshots.length,
        url: window.location.href
      });

      fetch(`${config.apiUrl}/api/snapshots/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdk_key: config.sdkKey,
          session_id: sessionId,
          snapshots: compressed,
          snapshot_count: validSnapshots.length
        })
        }).catch(function(error) {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.error('UXCam SDK: Failed to send snapshots', error);
          }
          // Re-add valid snapshots to queue on failure
          snapshotQueue.unshift(...validSnapshots);
        });
      }, null, null, 'flushSnapshots failed');
    }

    // Store session DB ID and project ID from backend responses
    let sessionDbId = null;
    let projectId = null;
    
    // Flush events to server - SAFE: Won't break website if it fails
    function flushEvents() {
      return safeAsyncExecute(function() {
        if (eventQueue.length === 0 || !sessionId) {
          return;
        }

        const events = eventQueue.splice(0, config.batchSize);
        
        fetch(`${config.apiUrl}/api/events/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sdk_key: config.sdkKey,
            session_id: sessionId,
            events: events,
            device_info: deviceInfo,
            user_properties: {}
          })
        })
        .then(response => response.json())
        .then(data => {
          // Store session DB ID and project ID from response
          if (data.session_id && !sessionDbId) {
            sessionDbId = data.session_id;
          }
          if (data.project_id && !projectId) {
            projectId = data.project_id;
          }
        })
        .catch(error => {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.error('UXCam SDK: Failed to send events', error);
          }
          // Re-add events to queue on failure
          eventQueue.unshift(...events);
        });

        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
      }, null, null, 'flushEvents failed');
    }

    // Schedule flush (for events only - snapshots are flushed on page unload)
    function scheduleFlush() {
      // If flushInterval is 0, don't schedule automatic flushing
      // Events will only flush when batch size is reached or on page unload
      if (config.flushInterval === 0) {
        return;
      }
      
      if (flushTimer) {
        return;
      }

      flushTimer = setTimeout(() => {
        flushEvents();
        // Don't flush snapshots here - they're only flushed on page unload (UXCam-style)
      }, config.flushInterval);
    }

    // Schedule snapshot flush (separate timer for snapshots)
    let snapshotFlushTimer = null;
    let periodicFlushInterval = null;
    
    function scheduleSnapshotFlush() {
      // DISABLED: Periodic flushing removed
      // Snapshots will only be flushed on:
      // 1. Page unload (beforeunload event)
      // 2. Page visibility change (when user switches tabs/minimizes)
      // 3. Batch size reached
      // This matches UXCam behavior - collect during session, send on exit
      return; // Do nothing - no periodic flushing
    }
    
    function stopPeriodicFlush() {
      if (periodicFlushInterval) {
        clearInterval(periodicFlushInterval);
        periodicFlushInterval = null;
      }
      if (snapshotFlushTimer) {
        clearTimeout(snapshotFlushTimer);
        snapshotFlushTimer = null;
      }
    }

    // End session (reusable function) - SAFE: Won't break website if it fails
    function endSession() {
      return safeExecute(function() {
        if (!sessionId) return;
        
        // Clear inactivity timer
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
          inactivityTimer = null;
        }
        
        // Stop periodic flushing
        stopPeriodicFlush();
        
        // Stop recording first
        if (stopRecording) {
          try {
            stopRecording();
            stopRecording = null;
          } catch (e) {
            if (window.UXCamSDK && window.UXCamSDK.debug) {
              console.warn('Error stopping recording:', e);
            }
          }
        }
        
        // Calculate session duration from ACTUAL ACTIVITY TIME (not idle time)
        // This prevents sessions from growing when user is inactive
        
        // Method 1: Calculate from first to last event (most accurate - only counts active time)
        let eventBasedDuration = 0;
        if (events.length > 0) {
          const timestamps = events
            .map(e => {
              // Use event timestamp if available
              if (e.timestamp && typeof e.timestamp === 'number') {
                return e.timestamp;
              }
              // Try to get timestamp from event data
              if (e.data && e.data.timestamp) {
                return typeof e.data.timestamp === 'number' ? e.data.timestamp : Date.now();
              }
              return null;
            })
            .filter(ts => ts !== null && ts > 0)
            .sort((a, b) => a - b);
          
          if (timestamps.length >= 2) {
            // Duration from first event to last event (actual activity window)
            eventBasedDuration = timestamps[timestamps.length - 1] - timestamps[0];
            console.log('UXCam SDK: Event-based duration calculated', {
              firstEvent: new Date(timestamps[0]).toISOString(),
              lastEvent: new Date(timestamps[timestamps.length - 1]).toISOString(),
              duration: Math.round(eventBasedDuration / 1000) + 's',
              eventCount: events.length
            });
          } else if (timestamps.length === 1) {
            // Only one event - use minimal duration (1 second)
            eventBasedDuration = 1000;
          }
        }
        
        // Method 2: Fallback to recording duration (but this includes idle time)
        const recordingDuration = recordingStartTime 
          ? Date.now() - recordingStartTime 
          : (sessionStartTime ? Date.now() - sessionStartTime : 0);
        
        // Use event-based duration if available (most accurate - only active time)
        // Otherwise use recording duration as fallback
        const finalDuration = eventBasedDuration > 0 ? eventBasedDuration : recordingDuration;
        
        console.log('UXCam SDK: Session duration calculation', {
          eventBased: Math.round(eventBasedDuration / 1000) + 's',
          recordingBased: Math.round(recordingDuration / 1000) + 's',
          final: Math.round(finalDuration / 1000) + 's',
          eventCount: events.length
        });
        
        // Track session end with duration
        trackEvent('session_end', {
          duration: finalDuration,
          recording_duration: recordingDuration,
          event_duration: eventBasedDuration
        });
        
        // Send session end update to backend - mark as closed/ended
        if (sessionDbId && config.apiUrl) {
          fetch(`${config.apiUrl}/api/sessions/${sessionDbId}/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              duration: finalDuration, // Use event-based duration (most accurate - only active time)
              end_time: new Date().toISOString(),
              is_closed: true, // Mark session as closed/ended - cannot be edited
              status: 'ended' // Session status: ended
            })
          }).then(response => {
            if (response.ok) {
              console.log('UXCam SDK: ✅ Session marked as ended/closed in backend');
            } else {
              console.warn('UXCam SDK: Failed to mark session as ended:', response.status);
            }
          }).catch(err => {
            if (window.UXCamSDK && window.UXCamSDK.debug) {
              console.warn('UXCam SDK: Failed to update session duration', err);
            }
          });
        }
        
        // CRITICAL: Flush all remaining data before ending session
        // Use synchronous flushing to ensure data is uploaded
        console.log('UXCam SDK: Ending session - flushing all remaining data', {
          eventQueueSize: eventQueue.length,
          snapshotQueueSize: snapshotQueue.length,
          eventsCount: events.length
        });
        
        // Flush events first (smaller, faster)
        if (eventQueue.length > 0) {
          console.log('UXCam SDK: Flushing remaining events before session end');
          flushEvents();
        }
        
        // Flush all collected snapshots when ending session
        if (snapshotQueue.length > 0) {
          console.log('UXCam SDK: Ending session, flushing all collected snapshots', {
            snapshotCount: snapshotQueue.length
          });
          flushSnapshots();
        }
        
        // Wait a moment for uploads to complete (if possible)
        // Note: This is best-effort - sendBeacon will handle final uploads
        if (eventQueue.length > 0 || snapshotQueue.length > 0) {
          console.warn('UXCam SDK: ⚠️ Still have data in queues after flush - will use sendBeacon on unload');
        }
      
        // Clear session from localStorage when ending
        // Also clean up any old session data to prevent localStorage bloat
        try {
          localStorage.removeItem('uxcam_session_id');
          localStorage.removeItem('uxcam_session_timestamp');
          localStorage.removeItem('uxcam_last_url');
          
          // Clean up any other old localStorage keys (prevent bloat)
          // Only remove keys that match our pattern and are old
          const keysToCheck = ['uxcam_session_id', 'uxcam_session_timestamp', 'uxcam_last_url'];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('uxcam_') && !keysToCheck.includes(key)) {
              try {
                localStorage.removeItem(key);
                console.log('UXCam SDK: Cleaned up old localStorage key:', key);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          }
        } catch (e) {
          console.warn('UXCam SDK: Failed to clean up localStorage:', e);
        }
        
        sessionId = null;
        sessionDbId = null;
        if (window.UXCamSDK && window.UXCamSDK.debug) {
          console.log('UXCam: Session ended', { duration: sessionDuration });
        }
      }, null, null, 'endSession failed');
    }
    
    // Start new session (can be called manually)
    function startNewSession() {
      if (sessionId) {
        endSession(); // End current session first
      }
      startSession();
      // Reset inactivity timer when starting new session
      resetInactivityTimer();
    }
    
    // Add event listeners for user activity
    function setupActivityTracking() {
      // Track clicks, inputs, scrolls, keypresses, mouse movements
      const activityEvents = ['click', 'input', 'scroll', 'keydown', 'keypress', 'mousemove', 'touchstart', 'touchmove'];
      
      activityEvents.forEach(eventType => {
        document.addEventListener(eventType, trackActivity, { passive: true });
      });
      
      // Also track window focus/blur
      window.addEventListener('focus', trackActivity);
      window.addEventListener('blur', () => {
        // If window loses focus, check if we should stop recording
        if (document.hidden && sessionId && stopRecording) {
          console.log('UXCam SDK: Window lost focus, ending session');
          endSession();
        }
      });
    }
    
    // Form field tracking
    let formFieldTrackingEnabled = true;
    let trackedForms = new Map(); // Map of form element to form ID
    
    function setupFormFieldTracking() {
      if (!formFieldTrackingEnabled) return;
      
      // Track all form fields on the page
      function trackFormField(field, action, value = null) {
        if (!sessionId || !config.sdkKey) return;
        
        // Find parent form
        let form = field.closest('form');
        if (!form) return;
        
        // Get or create form ID
        let formId = trackedForms.get(form);
        if (!formId) {
          formId = form.id || form.name || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          trackedForms.set(form, formId);
        }
        
        // Get field info
        const fieldName = field.name || field.id || field.placeholder || 'unnamed_field';
        const fieldType = field.type || field.tagName.toLowerCase();
        
        // Send form field event to backend (only if we have project ID and session DB ID)
        const currentProjectId = getProjectId();
        const currentSessionDbId = getSessionDbId();
        
        if (!currentProjectId || !currentSessionDbId) {
          // Queue the event to send later when we have the IDs
          return;
        }
        
        fetch(`${config.apiUrl}/api/funnels/${currentProjectId}/form-field-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: currentSessionDbId,
            form_id: formId,
            field_name: fieldName,
            field_type: fieldType,
            action: action, // 'focus', 'blur', 'change', 'submit', 'skip', 'abandon'
            value: action === 'change' && !field.matches('input[type="password"]') ? value : null
          })
        }).catch(error => {
          console.warn('UXCam SDK: Failed to send form field event', error);
        });
      }
      
      // Track form field focus
      document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea, select')) {
          trackFormField(e.target, 'focus');
        }
      }, true);
      
      // Track form field blur (completion or abandonment)
      document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, textarea, select')) {
          const field = e.target;
          const hasValue = field.value && field.value.trim().length > 0;
          
          // Check if user moved to another field (not abandoned)
          setTimeout(() => {
            if (document.activeElement && document.activeElement.matches('input, textarea, select, button')) {
              // User moved to another field - field was completed
              if (hasValue) {
                trackFormField(field, 'blur');
              } else {
                trackFormField(field, 'skip');
              }
            } else {
              // User left the form - field was abandoned
              trackFormField(field, 'abandon');
            }
          }, 100);
        }
      }, true);
      
      // Track form field changes
      document.addEventListener('input', (e) => {
        if (e.target.matches('input, textarea, select')) {
          trackFormField(e.target, 'change', e.target.value);
        }
      }, true);
      
      // Track form submissions
      document.addEventListener('submit', (e) => {
        if (e.target.matches('form')) {
          const form = e.target;
          const formId = trackedForms.get(form) || form.id || form.name || 'unknown';
          
          // Track all fields in the form as submitted
          const fields = form.querySelectorAll('input, textarea, select');
          fields.forEach(field => {
            if (field.value && field.value.trim().length > 0) {
              trackFormField(field, 'submit', field.value);
            }
          });
        }
      }, true);
    }
    
    // Helper to get project ID
    function getProjectId() {
      return projectId;
    }
    
    // Helper to get session DB ID
    function getSessionDbId() {
      return sessionDbId;
    }
    
    // Inactivity detection - stop recording if user is inactive
    let inactivityTimer = null;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity (matching session timeout)
    
    function resetInactivityTimer() {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      // Only set timer if we have an active session
      if (sessionId && stopRecording) {
        inactivityTimer = setTimeout(() => {
          console.log('UXCam SDK: User inactive for 30 minutes, ending session');
          endSession();
        }, INACTIVITY_TIMEOUT);
      }
    }
    
    // Track user activity to reset inactivity timer
    function trackActivity() {
      lastActivityTime = Date.now();
      resetInactivityTimer();
    }
    
    // Check session timeout
    function checkSessionTimeout() {
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      if (timeSinceLastActivity > config.sessionTimeout && sessionId) {
        endSession();
      }
    }

    // Track page view
    function trackPageView() {
      trackEvent('page_view', {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
      });
    }

    // Initialize - rewritten to ensure DOM and rrweb are ready
    function init() {
      if (!config.sdkKey) {
        console.warn('UXCam SDK: SDK key not found. Please configure window.UXCamSDK.key');
        return;
      }

      console.log('UXCam SDK: Initialization started', {
        domReady: document.readyState,
        rrwebAvailable: !!window.rrweb,
        sdkKey: config.sdkKey ? 'configured' : 'missing'
      });

      // Wait for DOM to be ready first
      waitForDOMReady(() => {
        console.log('UXCam SDK: ✅ DOM is ready, checking rrweb...');
        
        // Helper function to complete initialization (used by both normal and fallback paths)
        function completeInitialization() {
          // Track route changes for SPAs
          trackRouteChange();

          // Track page visibility changes - flush data when page becomes hidden
          // This is more reliable than beforeunload, especially on mobile devices
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              console.log('UXCam SDK: Page hidden, flushing snapshots and events');
              trackEvent('page_hidden');
              // Flush snapshots and events when user switches tabs or minimizes
              // Don't end session - user might come back
              if (sessionId && type2Uploaded) {
                // Check queue sizes and warn if too large
                if (snapshotQueue.length > WARN_QUEUE_SIZE) {
                  console.warn('UXCam SDK: ⚠️ Large snapshot queue before flush', {
                    size: snapshotQueue.length,
                    warningThreshold: WARN_QUEUE_SIZE
                  });
                }
                if (eventQueue.length > WARN_QUEUE_SIZE) {
                  console.warn('UXCam SDK: ⚠️ Large event queue before flush', {
                    size: eventQueue.length,
                    warningThreshold: WARN_QUEUE_SIZE
                  });
                }
                
                if (snapshotQueue.length > 0) {
                  flushSnapshots();
                }
                if (eventQueue.length > 0) {
                  flushEvents();
                }
              }
            } else {
              trackEvent('page_visible');
              // Don't auto-start - user needs to interact again
            }
          });
          
          // Periodic cleanup: Monitor queue sizes and clean up old localStorage data
          setInterval(() => {
            // Monitor queue sizes
            if (snapshotQueue.length > WARN_QUEUE_SIZE) {
              console.warn('UXCam SDK: ⚠️ Snapshot queue is large', {
                size: snapshotQueue.length,
                maxSize: MAX_SNAPSHOT_QUEUE_SIZE,
                warningThreshold: WARN_QUEUE_SIZE
              });
            }
            if (eventQueue.length > WARN_QUEUE_SIZE) {
              console.warn('UXCam SDK: ⚠️ Event queue is large', {
                size: eventQueue.length,
                maxSize: MAX_EVENT_QUEUE_SIZE,
                warningThreshold: WARN_QUEUE_SIZE
              });
            }
            
            // Clean up old localStorage data (prevent bloat)
            try {
              const now = Date.now();
              const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
              
              // Check if current session is expired
              const storedTimestamp = localStorage.getItem('uxcam_session_timestamp');
              if (storedTimestamp) {
                const sessionAge = now - parseInt(storedTimestamp, 10);
                if (sessionAge > SESSION_TIMEOUT) {
                  // Session expired - clean up
                  console.log('UXCam SDK: Cleaning up expired session from localStorage');
                  localStorage.removeItem('uxcam_session_id');
                  localStorage.removeItem('uxcam_session_timestamp');
                  localStorage.removeItem('uxcam_last_url');
                }
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          }, 5 * 60 * 1000); // Check every 5 minutes

          // Track page unload - flush data but DON'T clear session (for continuous recording across pages)
          window.addEventListener('beforeunload', () => {
            console.log('UXCam SDK: Page unloading, flushing data (session continues across pages)');
            trackEvent('page_unload');
            
            // CRITICAL: Record navigation event BEFORE stopping recording
            // This ensures navigation is captured in the current page's recording
            const currentUrl = window.location.href;
            const storedUrl = localStorage.getItem(STORAGE_URL_KEY);
            if (storedUrl && storedUrl !== currentUrl && stopRecording) {
              // URL changed - record navigation event immediately
              try {
                const navEvent = {
                  type: 4, // Meta event (navigation)
                  data: {
                    href: currentUrl,
                    url: currentUrl,
                    referrer: storedUrl,
                    width: window.innerWidth,
                    height: window.innerHeight
                  },
                  timestamp: Date.now()
                };
                // Add to events and queue immediately
                events.push(navEvent);
                snapshotQueue.push(navEvent);
                console.log('UXCam SDK: 📍 Navigation event recorded on page unload', {
                  from: storedUrl,
                  to: currentUrl,
                  sessionId: sessionId
                });
                
                // Store navigation info for next page
                window.__UXCAM_PENDING_NAVIGATION = {
                  from: storedUrl,
                  to: currentUrl,
                  timestamp: Date.now()
                };
              } catch (e) {
                console.warn('UXCam SDK: Error recording navigation on unload:', e);
              }
            }
            
            // Flush data but keep session alive for next page
            if (sessionId && stopRecording) {
              // CRITICAL: Flush all collected snapshots BEFORE stopping recording
              // This ensures all events including navigation are uploaded
              if (snapshotQueue.length > 0) {
                console.log('UXCam SDK: Flushing all collected snapshots on page unload', {
                  snapshotCount: snapshotQueue.length,
                  eventTypes: snapshotQueue.map(s => s?.type),
                  sessionId: sessionId,
                  hasNavigation: snapshotQueue.some(s => s?.type === 4)
                });
                // Flush via regular method first (faster)
                flushSnapshots();
              }
              
              // Stop recording AFTER flushing
              try {
                stopRecording();
                stopRecording = null;
              } catch (e) {
                console.warn('Error stopping recording:', e);
              }
              
              // Flush remaining events
              flushEvents();
              
              // CRITICAL: DO NOT clear localStorage on page unload
              // This allows the session to continue across page navigations
              // The session will only be cleared on actual session end (timeout, explicit end, etc.)
              console.log('UXCam SDK: Keeping session in localStorage for continuous recording across pages', {
                sessionId: sessionId
              });
            }
            
            // CRITICAL: Send remaining data synchronously using sendBeacon (reliable upload)
            // sendBeacon is guaranteed to send even if page is closing
            let pendingUploads = 0;
            
            if (eventQueue.length > 0) {
              const eventsToSend = [...eventQueue];
              eventQueue = [];
              pendingUploads++;
              
              const blob = new Blob([JSON.stringify({
                sdk_key: config.sdkKey,
                session_id: sessionId,
                events: eventsToSend,
                device_info: deviceInfo,
                user_properties: {}
              })], { type: 'application/json' });
              
              const sent = navigator.sendBeacon(`${config.apiUrl}/api/events/ingest`, blob);
              if (sent) {
                console.log('UXCam SDK: ✅ Events sent via sendBeacon', { count: eventsToSend.length });
              } else {
                console.warn('UXCam SDK: ⚠️ sendBeacon failed for events, trying fetch with keepalive');
                // Fallback: use fetch with keepalive
                fetch(`${config.apiUrl}/api/events/ingest`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sdk_key: config.sdkKey,
                    session_id: sessionId,
                    events: eventsToSend,
                    device_info: deviceInfo,
                    user_properties: {}
                  }),
                  keepalive: true
                }).catch(() => {
                  console.error('UXCam SDK: ❌ Failed to send events on unload - data may be lost');
                });
              }
            }

            // CRITICAL: Send all collected snapshots via sendBeacon (UXCam-style)
            // This ensures all snapshots are sent when user leaves the page
            if (snapshotQueue.length > 0) {
              const snapshots = [...snapshotQueue];
              snapshotQueue = [];
              pendingUploads++;
              
              const compressed = compressSnapshots(snapshots);
              
              const blob = new Blob([JSON.stringify({
                sdk_key: config.sdkKey,
                session_id: sessionId,
                snapshots: compressed,
                snapshot_count: snapshots.length,
                is_initial_snapshot: false
              })], { type: 'application/json' });
              
              const sent = navigator.sendBeacon(`${config.apiUrl}/api/snapshots/ingest`, blob);
              if (sent) {
                console.log('UXCam SDK: ✅ All snapshots sent via sendBeacon', {
                  snapshotCount: snapshots.length,
                  sizeKB: (blob.size / 1024).toFixed(2)
                });
              } else {
                console.warn('UXCam SDK: ⚠️ sendBeacon failed for snapshots, trying fetch with keepalive');
                // Fallback: use fetch with keepalive
                fetch(`${config.apiUrl}/api/snapshots/ingest`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sdk_key: config.sdkKey,
                    session_id: sessionId,
                    snapshots: compressed,
                    snapshot_count: snapshots.length,
                    is_initial_snapshot: false
                  }),
                  keepalive: true
                }).catch(() => {
                  console.error('UXCam SDK: ❌ Failed to send snapshots on unload - data may be lost');
                });
              }
            }
            
            if (pendingUploads > 0) {
              console.log('UXCam SDK: 📤 Final uploads initiated via sendBeacon', {
                uploadCount: pendingUploads,
                hasEvents: eventQueue.length > 0,
                hasSnapshots: snapshotQueue.length > 0
              });
            }

            if (stopRecording) {
              stopRecording();
            }
          });
          
          // Also handle pagehide event (more reliable on mobile devices)
          // This fires when page is actually being unloaded (browser close, tab close, navigation)
          window.addEventListener('pagehide', (event) => {
            console.log('UXCam SDK: Page hiding, flushing all data', {
              persisted: event.persisted // true if page is being cached (navigation), false if closing
            });
            stopPeriodicFlush();
            
            if (sessionId) {
              // Flush remaining events
              if (eventQueue.length > 0) {
                const events = [...eventQueue];
                eventQueue = [];
                const blob = new Blob([JSON.stringify({
                  sdk_key: config.sdkKey,
                  session_id: sessionId,
                  events: events,
                  device_info: deviceInfo,
                  user_properties: {}
                })], { type: 'application/json' });
                navigator.sendBeacon(`${config.apiUrl}/api/events/ingest`, blob);
              }
              
              // Flush remaining snapshots
              if (snapshotQueue.length > 0) {
                console.log('UXCam SDK: Page hiding, flushing snapshots', {
                  snapshotCount: snapshotQueue.length
                });
                const snapshots = [...snapshotQueue];
                snapshotQueue = [];
                const compressed = compressSnapshots(snapshots);
                
                const blob = new Blob([JSON.stringify({
                  sdk_key: config.sdkKey,
                  session_id: sessionId,
                  snapshots: compressed,
                  snapshot_count: snapshots.length,
                  is_initial_snapshot: false
                })], { type: 'application/json' });
                
                navigator.sendBeacon(`${config.apiUrl}/api/snapshots/ingest`, blob);
              }
              
              // Stop recording
              if (stopRecording) {
                try {
                  stopRecording();
                  stopRecording = null;
                } catch (e) {
                  console.warn('Error stopping recording on pagehide:', e);
                }
              }
              
              // If page is NOT being persisted (user is closing browser/tab, not navigating),
              // end the session. Otherwise, keep it alive for next page.
              if (!event.persisted) {
                console.log('UXCam SDK: Page not persisted - user closing browser/tab, ending session');
                // End session but don't clear localStorage immediately (let it expire naturally)
                // The session will be marked as ended when it times out or when user returns
                endSession();
              } else {
                console.log('UXCam SDK: Page persisted - navigation detected, keeping session alive');
                // Session continues on next page
              }
            }
          });
          
          // Note: visibilitychange handler is already set up above to flush data when page becomes hidden
          
          // Track errors/crashes
          window.addEventListener('error', (event) => {
            trackEvent('error', {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
              error: event.error ? event.error.toString() : null
            });
          });
          
          // Track unhandled promise rejections
          window.addEventListener('unhandledrejection', (event) => {
            trackEvent('unhandled_promise_rejection', {
              reason: event.reason ? event.reason.toString() : 'Unknown error'
            });
          });
          
          // ============================================
          // NETWORK CALLS TRACKING
          // ============================================
          // Intercept fetch() API calls
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            const startTime = Date.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url || args[0].toString();
            const method = args[1]?.method || 'GET';
            
            // Track request start
            trackEvent('network_request', {
              url: url,
              method: method,
              timestamp: new Date().toISOString(),
              status: 'pending'
            });
            
            // Call original fetch
            const fetchPromise = originalFetch.apply(this, args);
            
            // Track response
            fetchPromise
              .then(response => {
                const duration = Date.now() - startTime;
                trackEvent('network_response', {
                  url: url,
                  method: method,
                  status: response.status,
                  statusText: response.statusText,
                  duration: duration,
                  timestamp: new Date().toISOString(),
                  success: response.ok
                });
                return response;
              })
              .catch(error => {
                const duration = Date.now() - startTime;
                trackEvent('network_error', {
                  url: url,
                  method: method,
                  error: error.message || error.toString(),
                  duration: duration,
                  timestamp: new Date().toISOString()
                });
                throw error;
              });
            
            return fetchPromise;
          };
          
          // Intercept XMLHttpRequest
          const originalXHROpen = XMLHttpRequest.prototype.open;
          const originalXHRSend = XMLHttpRequest.prototype.send;
          
          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._uxcam_method = method;
            this._uxcam_url = url;
            this._uxcam_startTime = Date.now();
            return originalXHROpen.apply(this, [method, url, ...rest]);
          };
          
          XMLHttpRequest.prototype.send = function(...args) {
            const xhr = this;
            const url = xhr._uxcam_url || '';
            const method = xhr._uxcam_method || 'GET';
            const startTime = xhr._uxcam_startTime || Date.now();
            
            // Track request
            trackEvent('network_request', {
              url: url,
              method: method,
              timestamp: new Date().toISOString(),
              status: 'pending',
              type: 'xhr'
            });
            
            // Track response
            xhr.addEventListener('loadend', function() {
              const duration = Date.now() - startTime;
              trackEvent('network_response', {
                url: url,
                method: method,
                status: xhr.status,
                statusText: xhr.statusText,
                duration: duration,
                timestamp: new Date().toISOString(),
                success: xhr.status >= 200 && xhr.status < 400,
                type: 'xhr'
              });
            });
            
            // Track errors
            xhr.addEventListener('error', function() {
              const duration = Date.now() - startTime;
              trackEvent('network_error', {
                url: url,
                method: method,
                error: 'Network error',
                duration: duration,
                timestamp: new Date().toISOString(),
                type: 'xhr'
              });
            });
            
            return originalXHRSend.apply(this, args);
          };

          // Check session timeout periodically
          setInterval(checkSessionTimeout, 60000); // Check every minute

          console.log('UXCam SDK: ✅ Initialized', { 
            sessionId, 
            sdkKey: config.sdkKey,
            domReady: document.readyState,
            rrwebReady: !!window.rrweb,
            hasDOMRecording: !!stopRecording
          });
        }
        
        // Set a timeout fallback - if rrweb doesn't load in 5 seconds, initialize without it
        const fallbackTimeout = setTimeout(() => {
          if (!window.rrweb || typeof window.rrweb.snapshot !== 'function') {
            console.warn('UXCam SDK: ⚠️ rrweb not available after 5 seconds, initializing without DOM recording');
            console.warn('UXCam SDK: Basic event tracking will work, but session replay will not be available');
            initDeviceInfo();
            startSession();
            trackPageView();
            completeInitialization();
          }
        }, 5000);
        
        // Then wait for rrweb to be fully available
        waitForRrweb(() => {
          clearTimeout(fallbackTimeout); // Cancel fallback if rrweb loads
          console.log('UXCam SDK: ✅ Both DOM and rrweb are ready, initializing...');
          
          initDeviceInfo();
          startSession();
          trackPageView();
          completeInitialization();
        });
      });
    }

    // Track route changes (for SPAs)
    function trackRouteChange() {
      // Track pushState/replaceState for SPAs
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        const previousUrl = window.location.href;
        originalPushState.apply(history, args);
        
        // Track SPA route change (works for ANY route change)
        setTimeout(() => {
          const newUrl = window.location.href;
          if (previousUrl !== newUrl && sessionId && type2Uploaded) {
            // Record navigation event for SPA route change
            const navEvent = {
              type: 4, // Meta event (navigation)
              data: {
                href: newUrl,
                url: newUrl,
                referrer: previousUrl,
                width: window.innerWidth,
                height: window.innerHeight,
                navigationType: 'pushState' // SPA route change
              },
              timestamp: Date.now()
            };
            
            events.push(navEvent);
            snapshotQueue.push(navEvent);
            
            // Update stored URL
            localStorage.setItem(STORAGE_URL_KEY, newUrl);
            
            console.log('UXCam SDK: 📍 SPA route change detected', {
              from: previousUrl,
              to: newUrl,
              sessionId: sessionId,
              note: 'Works for ANY route change (not just specific pages)'
            });
            
            // Flush navigation event
            if (snapshotQueue.length > 0) {
              flushSnapshots();
            }
          }
        }, 0);
        trackPageView();
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        trackPageView();
      };
      
      // Track popstate (back/forward)
      window.addEventListener('popstate', () => {
        trackPageView();
      });
    }

    // Public API - Set early so status checks can detect SDK - ALL METHODS ARE SAFE
    window.UXCam = {
      track: function(type, data) {
        return safeExecute(function() {
          trackEvent(type, data);
        }, null, null, 'UXCam.track failed');
      },
      trackPageView: function() {
        return safeExecute(function() {
          trackPageView();
        }, null, null, 'UXCam.trackPageView failed');
      },
      identify: function(userId, properties) {
        return safeExecute(function() {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.log('UXCam: User identified', userId, properties);
          }
          // Store user properties for future use
          if (properties && deviceInfo) {
            Object.assign(deviceInfo, properties);
          }
        }, null, null, 'UXCam.identify failed');
      },
      setUserProperties: function(properties) {
        return safeExecute(function() {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.log('UXCam: User properties set', properties);
          }
          // Store user properties for future use
          if (properties && deviceInfo) {
            Object.assign(deviceInfo, properties);
          }
        }, null, null, 'UXCam.setUserProperties failed');
      },
      start: function() {
        return safeExecute(function() {
          startNewSession();
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.log('UXCam: Session started manually');
          }
        }, null, null, 'UXCam.start failed');
      },
      stop: function() {
        return safeExecute(function() {
          endSession();
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.log('UXCam: Session stopped manually');
          }
        }, null, null, 'UXCam.stop failed');
      },
      setPrivacyMode: function(enabled) {
        // Privacy mode - stop recording if enabled
        if (enabled && stopRecording) {
          stopRecording();
          console.log('UXCam: Privacy mode enabled - recording stopped');
        } else if (!enabled && !sessionId) {
          startSession();
          console.log('UXCam: Privacy mode disabled - recording started');
        }
      },
      maskElement: function(selector) {
        // Add mask class to specific elements
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.classList.add('uxcam-mask');
        });
        console.log(`UXCam: Masked ${elements.length} elements with selector: ${selector}`);
      },
      // Status check
      isReady: function() {
        return !!sessionId;
      }
    };
    
    // Log that SDK API is available (even if not fully initialized)
    console.log('UXCam SDK: Public API available (initialization in progress...)');

    // Auto-initialize - SPECIFICALLY wait for rrweb object to be ready
    // Step 1: Wait for DOM
    waitForDOMReady(() => {
      console.log('UXCam SDK: DOM ready, now waiting specifically for rrweb object...', {
        rrwebExists: !!window.rrweb,
        hasSnapshot: typeof window.rrweb?.snapshot === 'function',
        hasTakeFullSnapshot: typeof window.rrweb?.record?.takeFullSnapshot === 'function',
        hasRecord: typeof window.rrweb?.record === 'function'
      });
      
      // Step 2: SPECIFICALLY wait for rrweb object (not just DOM)
      // SIMPLIFIED: Check if rrweb is already loaded (bundled version)
      if (window.rrweb) {
        console.log('UXCam SDK: ✅ rrweb object already available, initializing...');
        init();
      } else {
        console.log('UXCam SDK: Waiting for rrweb object to be ready...');
        // Wait specifically for rrweb object
        waitForRrweb(() => {
          console.log('UXCam SDK: ✅ rrweb object is ready, initializing...');
          init();
        });
        
        // If rrweb doesn't load, try loading manually
        setTimeout(() => {
          if (!window.rrweb) {
            console.log('UXCam SDK: rrweb not found after wait, loading manually...');
            loadRrwebManually(() => {
              console.log('UXCam SDK: rrweb loaded manually, initializing...');
              init();
            });
          }
        }, 2000); // Give it 2 seconds before trying to load manually
      }
    });
  }
  
  // Check if we should exclude this domain/page from recording
  // This prevents the SDK from recording the analytics dashboard itself
  // Users can disable recording by setting window.UXCamSDK.disabled = true
  function shouldExcludeRecording() {
    try {
      var pathname = window.location.pathname;
      
      // NO DEFAULT EXCLUSIONS - Track all pages by default
      // Users can explicitly exclude paths via window.UXCamSDK.excludePaths if needed
      // This allows tracking of dashboard, admin, login, and all other pages
      
      // Check if explicitly disabled by user
      if (window.UXCamSDK && window.UXCamSDK.disabled === true) {
        if (window.UXCamSDK.debug) {
          console.log('UXCam SDK: Disabled by configuration (window.UXCamSDK.disabled = true)');
        }
        return true;
      }
      
      // Check if user wants to exclude specific paths (custom exclusion only)
      // Users can set window.UXCamSDK.excludePaths = ['/path1', '/path2'] to exclude specific paths
      if (window.UXCamSDK && window.UXCamSDK.excludePaths) {
        var customExcludePaths = window.UXCamSDK.excludePaths;
        if (Array.isArray(customExcludePaths)) {
          for (var k = 0; k < customExcludePaths.length; k++) {
            if (pathname.startsWith(customExcludePaths[k])) {
              if (window.UXCamSDK.debug) {
                console.log('UXCam SDK: Excluded from recording (custom exclude path: ' + customExcludePaths[k] + ')');
              }
              return true;
            }
          }
        }
      }
      
      // By default, allow recording on ALL pages (dashboard, admin, login, etc.)
      return false;
    } catch (e) {
      // If check fails, allow recording (fail open - don't break user websites)
      return false;
    }
  }

  // Domain validation removed - SDK works on any website
  // No domain restrictions - developers can use SDK key on any domain

  // Start initialization immediately when script loads - SAFE: Won't break website
  // Check if SDK config is available and if we should record
  // IMPROVED: More robust initialization that works on ALL pages (homepage, login, signup, etc.)
  var initAttempts = 0;
  var maxInitAttempts = 50; // Try for up to 5 seconds (50 * 100ms)
  var isInitializing = false;
  
  function tryInitialize() {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing) {
      return;
    }
    
    initAttempts++;
    
    safeExecute(function() {
      // First check if we should exclude this page
      if (shouldExcludeRecording()) {
        if (window.UXCamSDK && window.UXCamSDK.debug) {
          console.log('UXCam SDK: Recording disabled for this page/domain:', window.location.pathname);
        }
        return; // Don't initialize SDK if explicitly excluded
      }
      
      // Check if config is available
      if (window.UXCamSDK && window.UXCamSDK.key && window.UXCamSDK.apiUrl) {
        // Mark as initializing to prevent duplicate calls
        isInitializing = true;
        
        // Initialize SDK - works on ANY page (homepage, login, signup, dashboard, etc.)
        if (window.UXCamSDK.debug) {
          console.log('UXCam SDK: ✅ Configuration found, starting initialization on:', window.location.pathname);
        } else {
          // Even without debug mode, log a simple message so users know SDK is working
          console.log('UXCam SDK: Initializing on', window.location.pathname);
        }
        
        try {
          initSDK();
          return true; // Success
        } catch (e) {
          isInitializing = false;
          console.error('UXCam SDK: ❌ Initialization failed:', e);
          return false;
        }
      } else {
        // Config not ready yet - retry if we haven't exceeded max attempts
        if (initAttempts < maxInitAttempts) {
          setTimeout(tryInitialize, 100);
        } else {
          // Max attempts reached - log error (even without debug mode for visibility)
          console.warn('UXCam SDK: ⚠️ Configuration not found after', initAttempts, 'attempts.');
          console.warn('UXCam SDK: Please ensure window.UXCamSDK.key and window.UXCamSDK.apiUrl are set on ALL pages.');
          console.warn('UXCam SDK: Current page:', window.location.href);
          console.warn('UXCam SDK: To fix: Add this to EVERY page before the SDK script:');
          console.warn('  <script>');
          console.warn('    window.UXCamSDK = {');
          console.warn('      key: "YOUR_SDK_KEY",');
          console.warn('      apiUrl: "YOUR_API_URL"');
          console.warn('    };');
          console.warn('  </script>');
        }
        return false;
      }
    }, null, null, 'SDK initialization attempt failed');
  }
  
  // Start trying to initialize immediately
  tryInitialize();
  
  // Also try when DOM is ready (in case script loaded before DOM)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (!isInitializing && initAttempts < maxInitAttempts) {
        tryInitialize();
      }
    });
  }
  
  // Also try when page is fully loaded (in case config is set very late)
  window.addEventListener('load', function() {
    if (!isInitializing && initAttempts < maxInitAttempts) {
      setTimeout(tryInitialize, 500);
    }
  });
})();

