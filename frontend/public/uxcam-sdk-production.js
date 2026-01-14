/**
 * UXCam Analytics SDK - Production Version
 * Safe for live websites - all errors are caught and won't break the site
 * 
 * Integration:
 * 1. Add this script to your website's <head> or before </body>
 * 2. Configure with your SDK key:
 *    <script>
 *      window.UXCamSDK = {
 *        key: 'YOUR_SDK_KEY_HERE',
 *        apiUrl: 'https://your-api-domain.com' // Optional, defaults to production API
 *      };
 *    </script>
 *    <script src="https://your-cdn.com/uxcam-sdk-production.js"></script>
 */

(function() {
  'use strict';

  // ============================================
  // SAFETY WRAPPER - Prevents any errors from breaking the website
  // ============================================
  function safeExecute(fn, context, fallback) {
    try {
      return fn.call(context);
    } catch (error) {
      // Silently log errors in production, only warn in development
      if (window.UXCamSDK && window.UXCamSDK.debug) {
        console.warn('UXCam SDK Error:', error);
      }
      return fallback !== undefined ? fallback : null;
    }
  }

  function safeAsyncExecute(fn, context, fallback) {
    try {
      const result = fn.call(context);
      if (result && typeof result.then === 'function') {
        return result.catch(function(error) {
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.warn('UXCam SDK Async Error:', error);
          }
          return fallback !== undefined ? fallback : null;
        });
      }
      return result;
    } catch (error) {
      if (window.UXCamSDK && window.UXCamSDK.debug) {
        console.warn('UXCam SDK Error:', error);
      }
      return fallback !== undefined ? fallback : null;
    }
  }

  // ============================================
  // POLYFILLS - Safe polyfills that won't break existing code
  // ============================================
  safeExecute(function() {
    if (typeof Element !== 'undefined' && !Element.prototype.matches) {
      var matchesImpl = 
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function(selector) {
          try {
            if (!this || !this.ownerDocument) return false;
            var matches = this.ownerDocument.querySelectorAll(selector);
            var i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;
          } catch (e) {
            return false;
          }
        };
      
      var boundMatches = function(selector) {
        try {
          return matchesImpl.call(this, selector);
        } catch (e) {
          return false;
        }
      };
      
      try {
        Object.defineProperty(Element.prototype, 'matches', {
          value: boundMatches,
          writable: true,
          enumerable: false,
          configurable: true
        });
      } catch (e) {
        Element.prototype.matches = boundMatches;
      }
    }
  });

  // ============================================
  // SDK STATE
  // ============================================
  var isInitialized = false;
  var isRecording = false;
  var sessionId = null;
  var deviceInfo = {};
  var eventQueue = [];
  var snapshotQueue = [];
  var stopRecording = null;
  var inactivityTimer = null;
  var activityTimeout = 30000; // 30 seconds
  var config = {
    apiUrl: 'http://localhost:3001',
    sdkKey: null,
    batchSize: 10,
    flushInterval: 5000
  };

  // ============================================
  // UTILITY FUNCTIONS - All wrapped in safeExecute
  // ============================================
  function generateSessionId() {
    return safeExecute(function() {
      return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }, null, 'sess_' + Date.now());
  }

  function initDeviceInfo() {
    safeExecute(function() {
      deviceInfo = {
        userAgent: navigator.userAgent || 'Unknown',
        language: navigator.language || 'en',
        platform: navigator.platform || 'Unknown',
        screenWidth: window.screen ? window.screen.width : 0,
        screenHeight: window.screen ? window.screen.height : 0,
        viewportWidth: window.innerWidth || 0,
        viewportHeight: window.innerHeight || 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        timestamp: new Date().toISOString()
      };
    });
  }

  function compressSnapshots(snapshots) {
    return safeExecute(function() {
      if (typeof LZString !== 'undefined' && LZString.compress) {
        return LZString.compress(JSON.stringify(snapshots));
      }
      return JSON.stringify(snapshots);
    }, null, JSON.stringify(snapshots));
  }

  // ============================================
  // NETWORK FUNCTIONS - Safe network calls
  // ============================================
  function sendEvents(events) {
    if (!events || events.length === 0) return;
    
    safeAsyncExecute(function() {
      var payload = {
        sdk_key: config.sdkKey,
        session_id: sessionId,
        events: events,
        device_info: deviceInfo
      };

      // Use sendBeacon for reliability (doesn't block page unload)
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(config.apiUrl + '/api/events/ingest', blob);
        return;
      }

      // Fallback to fetch
      if (typeof fetch !== 'undefined') {
        fetch(config.apiUrl + '/api/events/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function() {
          // Silently fail - don't break the website
        });
      }
    });
  }

  function sendSnapshots(snapshots) {
    if (!snapshots || snapshots.length === 0) return;
    
    safeAsyncExecute(function() {
      var compressed = compressSnapshots(snapshots);
      var payload = {
        sdk_key: config.sdkKey,
        session_id: sessionId,
        snapshots: compressed,
        snapshot_count: snapshots.length,
        is_initial_snapshot: false,
        device_info: deviceInfo
      };

      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(config.apiUrl + '/api/snapshots/ingest', blob);
        return;
      }

      if (typeof fetch !== 'undefined') {
        fetch(config.apiUrl + '/api/snapshots/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function() {
          // Silently fail
        });
      }
    });
  }

  function flushQueues() {
    safeExecute(function() {
      if (eventQueue.length > 0) {
        var events = eventQueue.splice(0, config.batchSize);
        sendEvents(events);
      }
      
      if (snapshotQueue.length > 0) {
        var snapshots = snapshotQueue.splice(0, config.batchSize);
        sendSnapshots(snapshots);
      }
    });
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  function startSession() {
    safeExecute(function() {
      if (sessionId) return; // Session already started
      
      sessionId = generateSessionId();
      initDeviceInfo();
      
      // Start recording if rrweb is available
      if (window.rrweb && window.rrweb.record) {
        try {
          stopRecording = window.rrweb.record({
            emit: function(event) {
              safeExecute(function() {
                snapshotQueue.push(event);
                if (snapshotQueue.length >= config.batchSize) {
                  flushQueues();
                }
              });
            },
            checkoutEveryNms: 30000, // Checkpoint every 30 seconds
            recordCanvas: false, // Disable canvas recording for performance
            recordCrossOriginIframes: false
          });
          isRecording = true;
        } catch (e) {
          // If recording fails, continue without it
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.warn('UXCam: Recording failed, continuing without video:', e);
          }
        }
      }
      
      // Track initial page view
      trackEvent('page_view', {
        url: window.location.href,
        title: document.title
      });
      
      // Send initial snapshot if recording
      if (isRecording && window.rrweb && window.rrweb.record) {
        try {
          var initialSnapshot = window.rrweb.record.takeFullSnapshot();
          if (initialSnapshot) {
            snapshotQueue.push(initialSnapshot);
            sendSnapshots([initialSnapshot]);
          }
        } catch (e) {
          // Ignore snapshot errors
        }
      }
    });
  }

  function endSession() {
    safeExecute(function() {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
      
      if (stopRecording) {
        try {
          stopRecording();
        } catch (e) {
          // Ignore stop errors
        }
        stopRecording = null;
        isRecording = false;
      }
      
      // Flush remaining data
      flushQueues();
      
      sessionId = null;
    });
  }

  // ============================================
  // ACTIVITY TRACKING
  // ============================================
  function resetInactivityTimer() {
    safeExecute(function() {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      inactivityTimer = setTimeout(function() {
        endSession();
      }, activityTimeout);
    });
  }

  function trackActivity() {
    safeExecute(function() {
      resetInactivityTimer();
    });
  }

  function setupActivityTracking() {
    safeExecute(function() {
      var events = ['click', 'input', 'scroll', 'keypress', 'mousemove', 'touchstart'];
      events.forEach(function(eventType) {
        document.addEventListener(eventType, trackActivity, { passive: true, capture: true });
      });
      
      window.addEventListener('focus', trackActivity);
      window.addEventListener('blur', function() {
        endSession();
      });
    });
  }

  // ============================================
  // EVENT TRACKING
  // ============================================
  function trackEvent(type, data) {
    safeExecute(function() {
      if (!sessionId) {
        startSession();
      }
      
      var event = {
        type: type,
        timestamp: new Date().toISOString(),
        data: data || {}
      };
      
      eventQueue.push(event);
      
      if (eventQueue.length >= config.batchSize) {
        flushQueues();
      }
      
      trackActivity();
    });
  }

  // ============================================
  // FORM FIELD TRACKING
  // ============================================
  function initFormFieldTracking() {
    safeExecute(function() {
      document.addEventListener('focusin', function(e) {
        var target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          trackEvent('form_field_event', {
            action: 'focus',
            field_name: target.name || target.id || 'unknown',
            field_type: target.type || 'text',
            form_id: target.form ? target.form.id || 'unknown' : 'unknown'
          });
        }
      }, true);
      
      document.addEventListener('focusout', function(e) {
        var target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          trackEvent('form_field_event', {
            action: 'blur',
            field_name: target.name || target.id || 'unknown',
            field_type: target.type || 'text',
            form_id: target.form ? target.form.id || 'unknown' : 'unknown'
          });
        }
      }, true);
      
      document.addEventListener('change', function(e) {
        var target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          trackEvent('form_field_event', {
            action: 'change',
            field_name: target.name || target.id || 'unknown',
            field_type: target.type || 'text',
            form_id: target.form ? target.form.id || 'unknown' : 'unknown'
          });
        }
      }, true);
      
      document.addEventListener('submit', function(e) {
        var target = e.target;
        if (target && target.tagName === 'FORM') {
          trackEvent('form_field_event', {
            action: 'submit',
            form_id: target.id || 'unknown'
          });
        }
      }, true);
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function waitForDOMReady(callback) {
    safeExecute(function() {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        callback();
      } else {
        window.addEventListener('load', callback, { once: true });
        document.addEventListener('DOMContentLoaded', callback, { once: true });
      }
    });
  }

  function waitForRrweb(callback, maxRetries, retryDelay) {
    maxRetries = maxRetries || 20;
    retryDelay = retryDelay || 200;
    var retries = 0;
    
    function checkRrweb() {
      safeExecute(function() {
        if (window.rrweb && window.rrweb.record) {
          callback();
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(checkRrweb, retryDelay);
        } else {
          // Continue without rrweb - website still works
          if (window.UXCamSDK && window.UXCamSDK.debug) {
            console.warn('UXCam: rrweb not loaded, continuing without video recording');
          }
          callback(); // Still initialize, just without video
        }
      });
    }
    
    checkRrweb();
  }

  function init() {
    safeExecute(function() {
      if (isInitialized) return;
      if (!config.sdkKey) return;
      
      isInitialized = true;
      startSession();
      setupActivityTracking();
      initFormFieldTracking();
      
      // Flush queues periodically
      setInterval(flushQueues, config.flushInterval);
      
      // Handle page visibility
      document.addEventListener('visibilitychange', function() {
        safeExecute(function() {
          if (document.hidden) {
            endSession();
          } else {
            startSession();
          }
        });
      });
      
      // Handle page unload
      window.addEventListener('beforeunload', function() {
        safeExecute(function() {
          flushQueues();
          endSession();
        });
      });
    });
  }

  function initSDK() {
    safeExecute(function() {
      // Load configuration - REQUIRES apiUrl and key to be set
      if (window.UXCamSDK) {
        config.apiUrl = window.UXCamSDK.apiUrl;
        config.sdkKey = window.UXCamSDK.key;
        if (window.UXCamSDK.batchSize) config.batchSize = window.UXCamSDK.batchSize;
        if (window.UXCamSDK.flushInterval) config.flushInterval = window.UXCamSDK.flushInterval;
      }
      
      // Validate required configuration
      if (!config.apiUrl) {
        console.error('UXCam SDK: apiUrl is required. Please set window.UXCamSDK.apiUrl before loading the SDK.');
        return;
      }
      
      if (!config.sdkKey) {
        console.error('UXCam SDK: SDK key is required. Please set window.UXCamSDK.key before loading the SDK.');
        return;
      }
      
      // Wait for DOM
      waitForDOMReady(function() {
        // Wait for rrweb (optional - SDK works without it)
        waitForRrweb(function() {
          init();
        });
      });
    });
  }

  // ============================================
  // PUBLIC API - Always available, even if SDK fails
  // ============================================
  window.UXCam = {
    track: function(type, data) {
      safeExecute(function() {
        trackEvent(type, data);
      });
    },
    trackPageView: function() {
      safeExecute(function() {
        trackEvent('page_view', {
          url: window.location.href,
          title: document.title
        });
      });
    },
    identify: function(userId, properties) {
      safeExecute(function() {
        deviceInfo.userId = userId;
        if (properties) {
          Object.assign(deviceInfo, properties);
        }
      });
    },
    setUserProperties: function(properties) {
      safeExecute(function() {
        if (properties) {
          Object.assign(deviceInfo, properties);
        }
      });
    },
    start: function() {
      safeExecute(function() {
        startSession();
      });
    },
    stop: function() {
      safeExecute(function() {
        endSession();
      });
    },
    isReady: function() {
      return safeExecute(function() {
        return !!sessionId;
      }, null, false);
    }
  };

  // ============================================
  // AUTO-INITIALIZE - Safe initialization
  // ============================================
  safeExecute(function() {
    if (window.UXCamSDK && window.UXCamSDK.key) {
      initSDK();
    } else {
      // Wait a bit for config to be set
      setTimeout(function() {
        if (window.UXCamSDK && window.UXCamSDK.key) {
          initSDK();
        }
      }, 100);
    }
  });

})();

