import React from 'react';
import { NativeModules, Platform } from 'react-native';

const { UXCamModule } = NativeModules;

export interface UXCamConfig {
  sdkKey: string;
  apiUrl?: string;
  enableVideoRecording?: boolean;
  enableEventTracking?: boolean;
  enableAutomaticTracking?: boolean;
}

/**
 * UXCam React Native SDK
 * 
 * Provides session replay, event tracking, and user analytics for React Native apps.
 * 
 * This module bridges to native Android/iOS SDKs, maintaining the same
 * session IDs and analytics data across platforms.
 */
class UXCam {
  private static instance: UXCam;
  private isAutomaticTrackingEnabled = false;
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  
  static getInstance(): UXCam {
    if (!UXCam.instance) {
      UXCam.instance = new UXCam();
    }
    return UXCam.instance;
  }
  
  /**
   * Initialize UXCam SDK
   * 
   * @param config - SDK configuration
   */
  async initialize(config: UXCamConfig): Promise<void> {
    if (!UXCamModule) {
      console.warn('UXCam native module not found. Make sure you have linked the native module.');
      return;
    }
    
    try {
      await UXCamModule.initialize({
        sdkKey: config.sdkKey,
        apiUrl: config.apiUrl || 'https://uxcam-backend.vercel.app',
        enableVideoRecording: config.enableVideoRecording !== false,
        enableEventTracking: config.enableEventTracking !== false,
      });
      
      // Setup automatic tracking
      if (config.enableAutomaticTracking !== false && config.enableEventTracking !== false) {
        this.setupAutomaticTracking();
      }
    } catch (error) {
      console.error('UXCam initialize error:', error);
    }
  }
  
  /**
   * Setup automatic tracking (network, crashes, etc.)
   */
  private setupAutomaticTracking(): void {
    if (this.isAutomaticTrackingEnabled) return;
    
    // Setup network tracking
    this.setupNetworkTracking();
    
    // Setup crash detection
    this.setupCrashTracking();
    
    this.isAutomaticTrackingEnabled = true;
    console.log('✅ UXCam: Automatic tracking enabled');
  }
  
  /**
   * Setup automatic network call interception
   */
  private setupNetworkTracking(): void {
    // Intercept global fetch
    if (typeof fetch !== 'undefined' && !this.originalFetch) {
      this.originalFetch = global.fetch;
      
      global.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
        const startTime = Date.now();
        const url = typeof args[0] === 'string' ? args[0] : args[0].url || args[0].toString();
        const method = (args[1] as RequestInit)?.method || 'GET';
        
        // Track request
        await this.trackEvent('network_request', {
          url,
          method,
          auto_tracked: true,
        });
        
        try {
          const response = await this.originalFetch!(...args);
          const duration = Date.now() - startTime;
          
          // Track response
          await this.trackEvent('network_response', {
            url,
            method,
            status_code: response.status,
            status_text: response.statusText,
            duration,
            success: response.ok,
            auto_tracked: true,
          });
          
          return response;
        } catch (error: any) {
          const duration = Date.now() - startTime;
          
          // Track error
          await this.trackEvent('network_error', {
            url,
            method,
            error: error?.message || error?.toString() || 'Unknown error',
            duration,
            auto_tracked: true,
          });
          
          throw error;
        }
      };
    }
    
    // Intercept XMLHttpRequest
    if (typeof XMLHttpRequest !== 'undefined') {
      this.originalXHROpen = XMLHttpRequest.prototype.open;
      this.originalXHRSend = XMLHttpRequest.prototype.send;
      
      const self = this;
      
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
        (this as any)._uxcam_method = method;
        (this as any)._uxcam_url = typeof url === 'string' ? url : url.toString();
        (this as any)._uxcam_startTime = Date.now();
        return self.originalXHROpen!.apply(this, [method, url, ...rest]);
      };
      
      XMLHttpRequest.prototype.send = function(...args: any[]) {
        const xhr = this as any;
        const url = xhr._uxcam_url || '';
        const method = xhr._uxcam_method || 'GET';
        const startTime = xhr._uxcam_startTime || Date.now();
        
        // Track request
        self.trackEvent('network_request', {
          url,
          method,
          type: 'xhr',
          auto_tracked: true,
        });
        
        // Track response
        xhr.addEventListener('loadend', function() {
          const duration = Date.now() - startTime;
          self.trackEvent('network_response', {
            url,
            method,
            status_code: xhr.status,
            status_text: xhr.statusText,
            duration,
            success: xhr.status >= 200 && xhr.status < 400,
            type: 'xhr',
            auto_tracked: true,
          });
        });
        
        // Track error
        xhr.addEventListener('error', function() {
          const duration = Date.now() - startTime;
          self.trackEvent('network_error', {
            url,
            method,
            error: 'XHR Error',
            duration,
            type: 'xhr',
            auto_tracked: true,
          });
        });
        
        return self.originalXHRSend!.apply(this, args);
      };
    }
    
    console.log('✅ UXCam: Automatic network tracking enabled');
  }
  
  /**
   * Setup automatic crash detection
   */
  private setupCrashTracking(): void {
    // Global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      // Track crash
      this.logError(
        error.toString(),
        error.stack,
        {
          is_fatal: isFatal ?? false,
          auto_tracked: true,
        }
      );
      
      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
    
    // Unhandled promise rejection
    if (typeof global !== 'undefined') {
      const originalUnhandledRejection = (global as any).onunhandledrejection;
      (global as any).onunhandledrejection = (event: PromiseRejectionEvent) => {
        this.logError(
          event.reason?.toString() || 'Unhandled promise rejection',
          event.reason?.stack,
          {
            type: 'unhandled_promise_rejection',
            auto_tracked: true,
          }
        );
        
        if (originalUnhandledRejection) {
          originalUnhandledRejection(event);
        }
      };
    }
    
    console.log('✅ UXCam: Automatic crash detection enabled');
  }
  
  /**
   * Setup React Navigation listener for automatic screen tracking
   * 
   * Usage:
   * ```tsx
   * import { NavigationContainer } from '@react-navigation/native';
   * import UXCam from 'uxcam-react-native';
   * 
   * <NavigationContainer
   *   onStateChange={UXCam.getNavigationStateChangeHandler()}
   * >
   *   ...
   * </NavigationContainer>
   * ```
   */
  getNavigationStateChangeHandler() {
    return (state: any) => {
      if (!state) return;
      
      // Get current route
      const getCurrentRoute = (navState: any): any => {
        if (!navState) return null;
        if (navState.index !== undefined && navState.routes) {
          const route = navState.routes[navState.index];
          if (route.state) {
            return getCurrentRoute(route.state);
          }
          return route;
        }
        return navState;
      };
      
      const route = getCurrentRoute(state);
      if (route && route.name) {
        this.trackScreenView(route.name, {
          route_params: route.params,
          auto_tracked: true,
        });
      }
    };
  }
  
  /**
   * Get current session ID
   * 
   * Returns the same session ID used by native SDKs
   */
  async getSessionId(): Promise<string | null> {
    if (!UXCamModule) return null;
    
    try {
      return await UXCamModule.getSessionId();
    } catch (error) {
      console.error('UXCam getSessionId error:', error);
      return null;
    }
  }
  
  /**
   * Track a screen view / page view
   * 
   * @param screenName - Name of the screen
   * @param properties - Additional properties
   */
  async trackScreenView(
    screenName: string,
    properties?: Record<string, any>
  ): Promise<void> {
    if (!UXCamModule) return;
    
    try {
      await UXCamModule.trackScreenView({
        screenName,
        properties: properties || {},
      });
    } catch (error) {
      console.error('UXCam trackScreenView error:', error);
    }
  }
  
  /**
   * Track a custom event
   * 
   * @param eventName - Name of the event
   * @param properties - Event properties
   */
  async trackEvent(
    eventName: string,
    properties?: Record<string, any>
  ): Promise<void> {
    if (!UXCamModule) return;
    
    try {
      await UXCamModule.trackEvent({
        eventName,
        properties: properties || {},
      });
    } catch (error) {
      console.error('UXCam trackEvent error:', error);
    }
  }
  
  /**
   * Track a button click / tap
   * 
   * @param buttonId - Identifier for the button
   * @param properties - Additional properties
   */
  async trackButtonClick(
    buttonId: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent('button_click', {
      button_id: buttonId,
      ...properties,
    });
  }
  
  /**
   * Set user properties
   * 
   * @param userId - User identifier
   * @param properties - User properties
   */
  async setUserProperties(
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    if (!UXCamModule) return;
    
    try {
      await UXCamModule.setUserProperties({
        user_id: userId,
        properties: properties || {},
      });
    } catch (error) {
      console.error('UXCam setUserProperties error:', error);
    }
  }
  
  /**
   * Start screen recording
   * 
   * Note: Requires user permission on both platforms
   */
  async startRecording(): Promise<boolean> {
    if (!UXCamModule) return false;
    
    try {
      return await UXCamModule.startRecording();
    } catch (error) {
      console.error('UXCam startRecording error:', error);
      return false;
    }
  }
  
  /**
   * Stop screen recording
   */
  async stopRecording(): Promise<boolean> {
    if (!UXCamModule) return false;
    
    try {
      return await UXCamModule.stopRecording();
    } catch (error) {
      console.error('UXCam stopRecording error:', error);
      return false;
    }
  }
  
  /**
   * Log a network request
   * 
   * @param url - Request URL
   * @param method - HTTP method
   * @param statusCode - Response status code
   * @param duration - Request duration in milliseconds
   */
  async logNetworkRequest(
    url: string,
    method: string,
    statusCode?: number,
    duration?: number
  ): Promise<void> {
    await this.trackEvent('network_request', {
      url,
      method,
      status_code: statusCode,
      duration,
    });
  }
  
  /**
   * Log an error / crash
   * 
   * @param error - Error message
   * @param stackTrace - Stack trace
   * @param properties - Additional error properties
   */
  async logError(
    error: string,
    stackTrace?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent('error', {
      error,
      stack_trace: stackTrace,
      ...properties,
    });
  }
  
  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!UXCamModule) return;
    
    try {
      await UXCamModule.endSession();
    } catch (error) {
      console.error('UXCam endSession error:', error);
    }
  }
  
  /**
   * Restart session (creates new session ID)
   */
  async restartSession(): Promise<void> {
    if (!UXCamModule) return;
    
    try {
      await UXCamModule.restartSession();
    } catch (error) {
      console.error('UXCam restartSession error:', error);
    }
  }
}

// Export singleton instance
export default UXCam.getInstance();

// Named export for convenience
export const UXCamSDK = UXCam.getInstance();

/**
 * Error Boundary Component for React Native
 * 
 * Usage:
 * ```tsx
 * import { UXCamErrorBoundary } from 'uxcam-react-native';
 * 
 * <UXCamErrorBoundary>
 *   <App />
 * </UXCamErrorBoundary>
 * ```
 */
export class UXCamErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    UXCamSDK.logError(
      error.toString(),
      error.stack,
      {
        component_stack: errorInfo.componentStack,
        auto_tracked: true,
      }
    );
  }
  
  render() {
    if (this.state.hasError) {
      // You can render a fallback UI here
      return null;
    }
    
    return this.props.children;
  }
}

// Note: React import is needed for ErrorBoundary
// Add to your project: import React from 'react';
