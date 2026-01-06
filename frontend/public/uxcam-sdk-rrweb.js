/**
 * UXCam Analytics SDK with rrweb DOM Recording
 * Records DOM snapshots for visual session replay
 */

(function() {
  'use strict';

  // CRITICAL POLYFILL: Fix for "t.matches is not a function" and "Illegal invocation" errors
  // This prevents rrweb from crashing on elements that don't have matches()
  if (typeof Element !== 'undefined') {
    // Always ensure matches exists and is properly bound
    var matchesImpl = 
      Element.prototype.matchesSelector ||
      Element.prototype.mozMatchesSelector ||
      Element.prototype.msMatchesSelector ||
      Element.prototype.oMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      function(selector) {
        try {
          if (!this || !this.ownerDocument) return false;
          const matches = this.ownerDocument.querySelectorAll(selector);
          let i = matches.length;
          while (--i >= 0 && matches.item(i) !== this) {}
          return i > -1;
        } catch (e) {
          return false;
        }
      };
    
    // Bind to prevent "Illegal invocation" errors
    var boundMatches = function(selector) {
      return matchesImpl.call(this, selector);
    };
    
    if (!Element.prototype.matches) {
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
    } else {
      // Even if it exists, ensure it's properly bound
      var existingMatches = Element.prototype.matches;
      Element.prototype.matches = function(selector) {
        try {
          return existingMatches.call(this, selector);
        } catch (e) {
          if (e.message && e.message.includes('Illegal invocation')) {
            return boundMatches.call(this, selector);
          }
          throw e;
        }
      };
    }
  }
  
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
    // Configuration
    const config = {
      apiUrl: window.UXCamSDK?.apiUrl || 'http://localhost:3001',
      sdkKey: window.UXCamSDK?.key || '',
      batchSize: 200, // Larger batch size for bigger snapshots (depends on user activity)
      flushInterval: 15000, // 15 seconds - slower flushing to match user interaction timing
      // IMPORTANT: Always flush first event immediately to ensure type 2 is sent
      flushFirstEventImmediately: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      snapshotInterval: 5000, // Take snapshot every 5 seconds (slower, more realistic)
      checkoutInterval: 10000, // Take full snapshot every 10 seconds (for larger snapshots)
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
        
        deviceInfo = {
          userAgent: (navigator && navigator.userAgent) ? navigator.userAgent : 'unknown',
          platform: (navigator && navigator.platform) ? navigator.platform : 'unknown',
          language: (navigator && navigator.language) ? navigator.language : 'en',
          screenWidth: (window && window.screen && window.screen.width) ? window.screen.width : 0,
          screenHeight: (window && window.screen && window.screen.height) ? window.screen.height : 0,
          viewportWidth: (window && window.innerWidth) ? window.innerWidth : 0,
          viewportHeight: (window && window.innerHeight) ? window.innerHeight : 0,
          timezone: getTimezone(),
          cookieEnabled: getCookieEnabled(),
          online: getOnline(),
        };
      } catch (error) {
        console.error('UXCam SDK: Error initializing device info:', error);
        // Fallback device info
        deviceInfo = {
          userAgent: 'unknown',
          platform: 'unknown',
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
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
      
      try {
        const storedSessionId = localStorage.getItem(STORAGE_KEY);
        const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
        
        if (storedSessionId && storedTimestamp) {
          const sessionAge = Date.now() - parseInt(storedTimestamp, 10);
          // Reuse session if it's less than 30 minutes old
          if (sessionAge < SESSION_TIMEOUT) {
            console.log('UXCam SDK: Reusing existing session', storedSessionId);
            return storedSessionId;
          } else {
            // Session expired, clear it
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
          }
        }
      } catch (e) {
        // localStorage not available, continue with new session
        console.warn('UXCam SDK: localStorage not available, creating new session');
      }
      
      // Generate new session ID
      const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Store in localStorage
      try {
        localStorage.setItem(STORAGE_KEY, newSessionId);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
      } catch (e) {
        // Ignore if localStorage fails
      }
      
      return newSessionId;
    }

    // ============================================
    // CLEAN SESSION RECORDING - STEP BY STEP
    // ============================================
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
      
      // Step 3: Small delay for browser paint
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4: Initialize recording state
      type2Uploaded = false;
      let capturedType2 = null;
      let type2Resolve = null;
      const type2Promise = new Promise(resolve => { type2Resolve = resolve; });
      
      // Step 5: Start rrweb recording engine
      console.log('UXCam SDK: Starting rrweb recording...');
      stopRecording = window.rrweb.record({
        emit(event) {
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
          snapshotQueue.push(event);
          
          // Auto-flush when batch is full (larger batches = bigger snapshots)
          if (snapshotQueue.length >= config.batchSize) {
            flushSnapshots();
          } else {
            // Schedule flush based on user activity timing (slower, more realistic)
            scheduleSnapshotFlush();
          }
        },
        maskAllInputs: true,
        maskAllText: false, // Don't mask text to capture full content
        recordCanvas: true,
        recordCrossOriginIframes: false,
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
      
      // Step 6: Wait for Type 2 event (rrweb emits it automatically)
      try {
        const type2Event = await Promise.race([
          type2Promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        // Step 7: Validate Type 2 snapshot
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
        
        // Step 8: Upload Type 2 immediately
        console.log('UXCam SDK: Uploading Type 2 snapshot...');
        const compressed = compressSnapshots([type2Event]);
        
        // Log compression info
        console.log('UXCam SDK: Compression info', {
          compressedType: typeof compressed,
          compressedLength: typeof compressed === 'string' ? compressed.length : 'N/A'
        });
        
        const response = await fetch(`${config.apiUrl}/api/snapshots/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdk_key: config.sdkKey,
            session_id: sessionId,
            snapshots: compressed,
            snapshot_count: 1,
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
        
        // Step 9: Enable incremental events
        type2Uploaded = true;
        console.log('UXCam SDK: ✅ Type 2 uploaded, recording active');
        
      } catch (error) {
        console.error('UXCam SDK: Type 2 failed:', error.message);
        // Keep type2Uploaded = false to block events
      }
    }
    
    // OLD FUNCTION REMOVED - Incremental recording is now integrated into startRecording()
    // The emit function in startRecording() handles incremental events after type2Uploaded flag is set

    // Start new session
    function startSession() {
      sessionId = generateSessionId();
      sessionStartTime = Date.now();
      lastActivityTime = Date.now();
      events = [];
      
      // Setup activity tracking
      setupActivityTracking();
      
      // Start DOM recording
      startRecording();
      
      // Reset inactivity timer
      resetInactivityTimer();
      
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
        
        // Use LZ-string for compression if available
        if (window.LZString && jsonString) {
          return window.LZString.compress(jsonString);
        }
        // For now, send as JSON (can be compressed on backend)
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

    // Flush snapshots to server
    function flushSnapshots() {
      if (snapshotQueue.length === 0 || !sessionId) {
        console.warn('UXCam SDK: Cannot flush snapshots', {
          queueLength: snapshotQueue.length,
          sessionId: sessionId
        });
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
      }).catch(error => {
        console.error('UXCam SDK: Failed to send snapshots', error);
        // Re-add valid snapshots to queue on failure
        snapshotQueue.unshift(...validSnapshots);
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
        if (snapshotQueue.length > 0) {
          flushSnapshots();
        }
      }, config.flushInterval);
    }

    // Schedule snapshot flush (separate timer for snapshots)
    let snapshotFlushTimer = null;
    function scheduleSnapshotFlush() {
      if (snapshotFlushTimer) {
        return;
      }

      snapshotFlushTimer = setTimeout(() => {
        if (snapshotQueue.length > 0) {
          flushSnapshots();
        }
        snapshotFlushTimer = null;
      }, config.flushInterval); // Flush based on config (15 seconds - matches user interaction timing)
    }

    // End session (reusable function)
    function endSession() {
      if (!sessionId) return;
      
      // Clear inactivity timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
      
      // Stop recording first
      if (stopRecording) {
        try {
          stopRecording();
          stopRecording = null;
        } catch (e) {
          console.warn('Error stopping recording:', e);
        }
      }
      
      // Track session end
      trackEvent('session_end', {
        duration: Date.now() - sessionStartTime
      });
      
      // Flush remaining data
      flushEvents();
      flushSnapshots();
      
      // Clear session from localStorage when ending
      try {
        localStorage.removeItem('uxcam_session_id');
        localStorage.removeItem('uxcam_session_timestamp');
      } catch (e) {
        // Ignore if localStorage fails
      }
      
      sessionId = null;
      console.log('UXCam: Session ended');
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
    
    // Inactivity detection - stop recording if user is inactive
    let inactivityTimer = null;
    const INACTIVITY_TIMEOUT = 30 * 1000; // 30 seconds of inactivity
    
    function resetInactivityTimer() {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      // Only set timer if we have an active session
      if (sessionId && stopRecording) {
        inactivityTimer = setTimeout(() => {
          console.log('UXCam SDK: User inactive for 30 seconds, ending session');
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

          // Track page visibility changes - stop recording when user leaves
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              console.log('UXCam SDK: Page hidden, stopping recording');
              trackEvent('page_hidden');
              // Stop recording when user switches tabs or minimizes
              if (stopRecording && sessionId) {
                endSession();
              }
            } else {
              trackEvent('page_visible');
              // Don't auto-start - user needs to interact again
            }
          });

          // Track page unload - stop recording immediately
          window.addEventListener('beforeunload', () => {
            console.log('UXCam SDK: Page unloading, ending session');
            trackEvent('page_unload');
            
            // End session immediately
            if (sessionId && stopRecording) {
              // Stop recording first
              try {
                stopRecording();
              } catch (e) {
                console.warn('Error stopping recording:', e);
              }
              
              // Flush remaining data synchronously
              flushEvents();
              flushSnapshots();
              
              // Clear session
              try {
                localStorage.removeItem('uxcam_session_id');
                localStorage.removeItem('uxcam_session_timestamp');
              } catch (e) {
                // Ignore
              }
            }
            
            // Send remaining data synchronously using sendBeacon as backup
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
        originalPushState.apply(history, args);
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

    // Public API - Set early so status checks can detect SDK
    window.UXCam = {
      track: trackEvent,
      trackPageView: trackPageView,
      identify: function(userId, properties) {
        console.log('UXCam: User identified', userId, properties);
        // Store user properties for future use
        if (properties) {
          // Could send to backend to update session
        }
      },
      setUserProperties: function(properties) {
        console.log('UXCam: User properties set', properties);
        // Store user properties for future use
      },
      start: function() {
        // Manual session start
        startNewSession();
        console.log('UXCam: Session started manually');
      },
      stop: function() {
        // Manual session stop
        endSession();
        console.log('UXCam: Session stopped manually');
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
  
  // Start initialization immediately when script loads
  // Check if SDK config is available
  if (window.UXCamSDK && window.UXCamSDK.key) {
    console.log('UXCam SDK: Configuration found, starting initialization...');
    initSDK();
  } else {
    console.warn('UXCam SDK: Configuration not found. Waiting for window.UXCamSDK to be set...');
    // Wait a bit for config to be set (in case script loads before config)
    setTimeout(() => {
      if (window.UXCamSDK && window.UXCamSDK.key) {
        console.log('UXCam SDK: Configuration found after delay, starting initialization...');
        initSDK();
      } else {
        console.error('UXCam SDK: ❌ Configuration still not found. Please set window.UXCamSDK.key');
      }
    }, 100);
  }
})();

