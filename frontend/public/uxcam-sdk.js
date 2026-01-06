/**
 * UXCam Analytics SDK
 * Lightweight analytics tracking for web applications
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    apiUrl: window.UXCamSDK?.apiUrl || 'http://localhost:3001',
    sdkKey: window.UXCamSDK?.key || '',
    batchSize: 10,
    flushInterval: 5000,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  };

  // State
  let sessionId = null;
  let sessionStartTime = null;
  let eventQueue = [];
  let flushTimer = null;
  let lastActivityTime = Date.now();
  let deviceInfo = null;

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
    };
  }

  // Generate session ID
  function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Start new session
  function startSession() {
    sessionId = generateSessionId();
    sessionStartTime = Date.now();
    lastActivityTime = Date.now();
    
    // Track session start
    trackEvent('session_start', {
      timestamp: new Date().toISOString()
    });
  }

  // Track event
  function trackEvent(type, data = {}) {
    if (!config.sdkKey) {
      console.warn('UXCam SDK: SDK key not configured');
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

    // Flush if batch size reached
    if (eventQueue.length >= config.batchSize) {
      flushEvents();
    } else {
      scheduleFlush();
    }
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
      })
    }).catch(error => {
      console.error('UXCam SDK: Failed to send events', error);
      // Re-add events to queue on failure
      eventQueue.unshift(...events);
    });

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  // Schedule flush
  function scheduleFlush() {
    if (flushTimer) {
      return;
    }

    flushTimer = setTimeout(() => {
      flushEvents();
    }, config.flushInterval);
  }

  // Check session timeout
  function checkSessionTimeout() {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    if (timeSinceLastActivity > config.sessionTimeout && sessionId) {
      // End current session
      trackEvent('session_end', {
        duration: Date.now() - sessionStartTime
      });
      flushEvents();
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

  // Track click
  function trackClick(element, event) {
    trackEvent('click', {
      element: element.tagName,
      id: element.id || null,
      class: element.className || null,
      text: element.textContent?.substring(0, 100) || null,
      x: event.clientX,
      y: event.clientY,
    });
  }

  // Track scroll
  let scrollTimeout = null;
  function trackScroll() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    scrollTimeout = setTimeout(() => {
      trackEvent('scroll', {
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      });
    }, 100);
  }

  // Initialize
  function init() {
    if (!config.sdkKey) {
      console.warn('UXCam SDK: SDK key not found. Please configure window.UXCamSDK.key');
      return;
    }

    initDeviceInfo();
    startSession();
    trackPageView();

    // Track clicks
    document.addEventListener('click', (e) => {
      trackClick(e.target, e);
    }, true);

    // Track scrolls
    window.addEventListener('scroll', trackScroll, { passive: true });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        trackEvent('page_hidden');
      } else {
        trackEvent('page_visible');
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      trackEvent('page_unload');
      // Send remaining events synchronously
      if (eventQueue.length > 0) {
        const events = [...eventQueue];
        eventQueue = [];
        navigator.sendBeacon(
          `${config.apiUrl}/api/events/ingest`,
          JSON.stringify({
            sdk_key: config.sdkKey,
            session_id: sessionId,
            events: events,
            device_info: deviceInfo,
            user_properties: {}
          })
        );
      }
    });

    // Check session timeout periodically
    setInterval(checkSessionTimeout, 60000); // Check every minute

    console.log('UXCam SDK: Initialized', { sessionId, sdkKey: config.sdkKey });
  }

  // Public API
  window.UXCam = {
    track: trackEvent,
    trackPageView: trackPageView,
    identify: function(userId, properties) {
      // User identification (for future use)
      console.log('UXCam: User identified', userId, properties);
    },
    setUserProperties: function(properties) {
      // Set user properties (for future use)
      console.log('UXCam: User properties set', properties);
    }
  };

  // Auto-initialize if SDK key is available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

