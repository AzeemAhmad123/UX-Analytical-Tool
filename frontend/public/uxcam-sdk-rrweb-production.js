/**
 * UXCam Analytics SDK with rrweb DOM Recording - Production Version
 * Optimized for production deployment
 * 
 * Usage:
 * 1. Host this file on your CDN or in your public folder
 * 2. Load rrweb first: <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
 * 3. Configure: window.UXCamSDK = { key: 'YOUR_KEY', apiUrl: 'YOUR_API_URL' }
 * 4. Load this script: <script src="/uxcam-sdk-rrweb.js" async></script>
 */

(function() {
  'use strict';

  // Auto-detect environment
  const isProduction = typeof window !== 'undefined' && 
                       window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1';

  // Configuration - REQUIRES apiUrl to be set in window.UXCamSDK
  const sdkConfig = window.UXCamSDK || {};
  const apiUrl = sdkConfig.apiUrl;
  const sdkKey = sdkConfig.key || '';

  // Validate required configuration
  if (!apiUrl) {
    console.error('UXCam SDK: apiUrl is required. Please set window.UXCamSDK.apiUrl before loading the SDK.');
    return; // Exit early if apiUrl is not configured
  }

  if (!sdkKey) {
    console.error('UXCam SDK: SDK key is required. Please set window.UXCamSDK.key before loading the SDK.');
    return; // Exit early if SDK key is not configured
  }

  const config = {
    apiUrl: apiUrl,
    sdkKey: sdkKey,
    batchSize: 50,
    flushInterval: 10000, // 10 seconds
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    snapshotInterval: 2000, // Take snapshot every 2 seconds
    // Production optimizations
    enableCompression: true,
    enableBatching: true,
    maxQueueSize: 1000,
  };

  // State
  let sessionId = null;
  let sessionStartTime = null;
  let eventQueue = [];
  let snapshotQueue = [];
  let flushTimer = null;
  let lastActivityTime = Date.now();
  let deviceInfo = null;
  let stopRecording = null;
  let events = [];
  let isInitialized = false;

  // Initialize device info
  function initDeviceInfo() {
    deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
      url: window.location.href,
      referrer: document.referrer,
    };
  }

  // Generate session ID
  function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Start recording with rrweb
  function startRecording() {
    if (!window.rrweb) {
      console.warn('UXCam SDK: rrweb not loaded. Make sure to load rrweb before this script.');
      return;
    }

    try {
      // Start recording DOM changes
      stopRecording = window.rrweb.record({
        emit(event) {
          // Store events for replay
          events.push(event);
          
          // Add to snapshot queue
          snapshotQueue.push({
            type: 'snapshot',
            timestamp: Date.now(),
            data: event
          });

          // Compress and batch snapshots
          if (snapshotQueue.length >= config.batchSize) {
            flushSnapshots();
          }
        },
        // Privacy settings
        maskAllInputs: true,
        maskAllText: false,
        // Performance settings
        recordCanvas: true,
        recordCrossOriginIframes: false,
        // Sampling for performance
        sampling: {
          scroll: 150,
          input: 'last',
        },
        // Block sensitive elements
        blockClass: 'uxcam-block',
        blockSelector: '[data-uxcam-block]',
      });

      if (isProduction) {
        console.log('UXCam SDK: DOM recording started (production mode)');
      } else {
        console.log('UXCam SDK: DOM recording started', { sessionId, sdkKey: config.sdkKey });
      }
    } catch (error) {
      console.error('UXCam SDK: Failed to start recording', error);
    }
  }

  // Start new session
  function startSession() {
    sessionId = generateSessionId();
    sessionStartTime = Date.now();
    lastActivityTime = Date.now();
    events = [];
    
    // Start DOM recording
    startRecording();
    
    // Track session start
    trackEvent('session_start', {
      timestamp: new Date().toISOString()
    });
  }

  // Track event
  function trackEvent(type, data = {}) {
    if (!config.sdkKey) {
      if (!isProduction) {
        console.warn('UXCam SDK: SDK key not configured');
      }
      return;
    }

    if (!sessionId) {
      startSession();
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

    eventQueue.push(event);
    lastActivityTime = Date.now();

    // Prevent queue overflow
    if (eventQueue.length > config.maxQueueSize) {
      eventQueue.shift(); // Remove oldest
    }

    // Flush if batch size reached
    if (eventQueue.length >= config.batchSize) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  }

  // Compress snapshot data
  function compressSnapshots(snapshots) {
    if (!config.enableCompression) {
      return JSON.stringify(snapshots);
    }

    try {
      // For production, we'll compress on backend
      // For now, send as JSON (backend will compress)
      return JSON.stringify(snapshots);
    } catch (error) {
      if (!isProduction) {
        console.error('UXCam SDK: Compression failed', error);
      }
      return JSON.stringify(snapshots);
    }
  }

  // Flush snapshots to server
  function flushSnapshots() {
    if (snapshotQueue.length === 0 || !sessionId) {
      return;
    }

    const snapshots = snapshotQueue.splice(0, config.batchSize);
    const compressed = compressSnapshots(snapshots);

    fetch(`${config.apiUrl}/api/snapshots/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sdk_key: config.sdkKey,
        session_id: sessionId,
        snapshots: compressed,
        snapshot_count: snapshots.length
      }),
      keepalive: true // Important for beforeunload
    }).catch(error => {
      if (!isProduction) {
        console.error('UXCam SDK: Failed to send snapshots', error);
      }
      // Re-add snapshots to queue on failure (limit retries)
      if (snapshotQueue.length < config.maxQueueSize) {
        snapshotQueue.unshift(...snapshots);
      }
    });
  }

  // Flush events to server
  function flushEvents() {
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
      }),
      keepalive: true // Important for beforeunload
    }).catch(error => {
      if (!isProduction) {
        console.error('UXCam SDK: Failed to send events', error);
      }
      // Re-add events to queue on failure (limit retries)
      if (eventQueue.length < config.maxQueueSize) {
        eventQueue.unshift(...events);
      }
    });

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  // Schedule flush
  function scheduleFlush() {
    if (flushTimer || !config.enableBatching) {
      return;
    }

    flushTimer = setTimeout(() => {
      flushEvents();
      if (snapshotQueue.length > 0) {
        flushSnapshots();
      }
    }, config.flushInterval);
  }

  // Check session timeout
  function checkSessionTimeout() {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    if (timeSinceLastActivity > config.sessionTimeout && sessionId) {
      // End current session
      if (stopRecording) {
        stopRecording();
      }
      trackEvent('session_end', {
        duration: Date.now() - sessionStartTime
      });
      flushEvents();
      flushSnapshots();
      sessionId = null;
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

  // Initialize
  function init() {
    if (isInitialized) {
      return;
    }

    if (!config.sdkKey) {
      if (!isProduction) {
        console.warn('UXCam SDK: SDK key not found. Please configure window.UXCamSDK.key');
      }
      return;
    }

    if (!window.rrweb) {
      if (!isProduction) {
        console.warn('UXCam SDK: Waiting for rrweb to load...');
      }
      // Retry after a delay
      setTimeout(init, 1000);
      return;
    }

    isInitialized = true;
    initDeviceInfo();
    startSession();
    trackPageView();

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        trackEvent('page_hidden');
      } else {
        trackEvent('page_visible');
      }
    });

    // Track before unload - send remaining data
    window.addEventListener('beforeunload', () => {
      trackEvent('page_unload');
      
      // Send remaining data synchronously using sendBeacon
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

      if (snapshotQueue.length > 0) {
        const snapshots = [...snapshotQueue];
        snapshotQueue = [];
        const compressed = compressSnapshots(snapshots);
        const blob = new Blob([JSON.stringify({
          sdk_key: config.sdkKey,
          session_id: sessionId,
          snapshots: compressed,
          snapshot_count: snapshots.length
        })], { type: 'application/json' });
        navigator.sendBeacon(`${config.apiUrl}/api/snapshots/ingest`, blob);
      }

      if (stopRecording) {
        stopRecording();
      }
    });

    // Check session timeout periodically
    setInterval(checkSessionTimeout, 60000); // Check every minute

    if (!isProduction) {
      console.log('UXCam SDK: Initialized with DOM recording', { sessionId, sdkKey: config.sdkKey });
    }
  }

  // Public API
  window.UXCam = {
    track: trackEvent,
    trackPageView: trackPageView,
    identify: function(userId, properties) {
      // User identification
      if (!isProduction) {
        console.log('UXCam: User identified', userId, properties);
      }
    },
    setUserProperties: function(properties) {
      // Set user properties
      if (!isProduction) {
        console.log('UXCam: User properties set', properties);
      }
    },
    stop: function() {
      if (stopRecording) {
        stopRecording();
      }
    }
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

