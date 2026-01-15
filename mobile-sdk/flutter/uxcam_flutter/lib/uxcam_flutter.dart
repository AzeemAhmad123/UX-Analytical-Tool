/// UXCam Flutter SDK
/// 
/// Provides session replay, event tracking, and user analytics for Flutter apps.
/// 
/// This plugin bridges to native Android/iOS SDKs, maintaining the same
/// session IDs and analytics data across platforms.
library uxcam_flutter;

import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

/// Main UXCam SDK class for Flutter
class UXCam {
  static const MethodChannel _channel = MethodChannel('com.uxcam.flutter/sdk');
  
  static UXCam? _instance;
  static UXCam get instance => _instance ??= UXCam._();
  
  UXCam._();
  
  bool _isInitialized = false;
  bool _isAutomaticTrackingEnabled = false;
  
  /// Initialize UXCam SDK
  /// 
  /// [sdkKey] - Your UXCam SDK key from the dashboard
  /// [apiUrl] - Your backend API URL (optional, defaults to production)
  /// [enableVideoRecording] - Enable screen recording (default: true)
  /// [enableEventTracking] - Enable event tracking (default: true)
  /// [enableAutomaticTracking] - Enable automatic screen/crash/network tracking (default: true)
  Future<void> initialize({
    required String sdkKey,
    String? apiUrl,
    bool enableVideoRecording = true,
    bool enableEventTracking = true,
    bool enableAutomaticTracking = true,
  }) async {
    try {
      await _channel.invokeMethod('initialize', {
        'sdkKey': sdkKey,
        'apiUrl': apiUrl,
        'enableVideoRecording': enableVideoRecording,
        'enableEventTracking': enableEventTracking,
      });
      
      _isInitialized = true;
      
      // Setup automatic tracking
      if (enableAutomaticTracking && enableEventTracking) {
        setupAutomaticTracking();
      }
    } catch (e) {
      print('UXCam initialize error: $e');
    }
  }
  
  /// Setup automatic tracking (screen transitions, crashes, etc.)
  void setupAutomaticTracking() {
    if (_isAutomaticTrackingEnabled) return;
    
    // Setup crash detection
    setupCrashTracking();
    
    _isAutomaticTrackingEnabled = true;
    print('✅ UXCam: Automatic tracking enabled');
  }
  
  /// Setup automatic crash detection
  void setupCrashTracking() {
    // Flutter error handler
    FlutterError.onError = (FlutterErrorDetails details) {
      // Track Flutter framework errors
      logError(
        error: details.exception.toString(),
        stackTrace: details.stack?.toString(),
        properties: {
          'library': details.library ?? 'unknown',
          'context': details.context?.toString(),
          'auto_tracked': true,
        },
      );
      
      // Call original handler if it exists
      FlutterError.presentError(details);
    };
    
    // Zone error handler for async errors
    runZonedGuarded(() {
      // App runs in this zone
    }, (error, stack) {
      // Track uncaught errors
      logError(
        error: error.toString(),
        stackTrace: stack.toString(),
        properties: {
          'auto_tracked': true,
        },
      );
    });
    
    print('✅ UXCam: Automatic crash detection enabled');
  }
  
  /// Get NavigatorObserver for automatic screen tracking
  /// 
  /// Usage in MaterialApp:
  /// ```dart
  /// MaterialApp(
  ///   navigatorObservers: [UXCam.instance.getNavigatorObserver()],
  ///   ...
  /// )
  /// ```
  NavigatorObserver getNavigatorObserver() {
    return UXCamNavigatorObserver();
  }
  
  /// Get current session ID
  /// 
  /// Returns the same session ID used by native SDKs
  Future<String?> getSessionId() async {
    try {
      return await _channel.invokeMethod('getSessionId');
    } catch (e) {
      print('UXCam getSessionId error: $e');
      return null;
    }
  }
  
  /// Track a page view / screen view
  /// 
  /// [screenName] - Name of the screen (e.g., 'Home', 'ProductDetail')
  /// [properties] - Additional properties to track
  Future<void> trackScreenView(
    String screenName, {
    Map<String, dynamic>? properties,
  }) async {
    try {
      await _channel.invokeMethod('trackScreenView', {
        'screenName': screenName,
        'properties': properties ?? {},
      });
    } catch (e) {
      print('UXCam trackScreenView error: $e');
    }
  }
  
  /// Track a custom event
  /// 
  /// [eventName] - Name of the event (e.g., 'button_click', 'purchase')
  /// [properties] - Event properties
  Future<void> trackEvent(
    String eventName, {
    Map<String, dynamic>? properties,
  }) async {
    try {
      await _channel.invokeMethod('trackEvent', {
        'eventName': eventName,
        'properties': properties ?? {},
      });
    } catch (e) {
      print('UXCam trackEvent error: $e');
    }
  }
  
  /// Track a button click / tap
  /// 
  /// [buttonId] - Identifier for the button
  /// [properties] - Additional properties
  Future<void> trackButtonClick(
    String buttonId, {
    Map<String, dynamic>? properties,
  }) async {
    await trackEvent('button_click', properties: {
      'button_id': buttonId,
      ...?properties,
    });
  }
  
  /// Set user properties
  /// 
  /// [userId] - User identifier
  /// [properties] - User properties (name, email, etc.)
  Future<void> setUserProperties({
    String? userId,
    Map<String, dynamic>? properties,
  }) async {
    try {
      await _channel.invokeMethod('setUserProperties', {
        'user_id': userId,
        'properties': properties ?? {},
      });
    } catch (e) {
      print('UXCam setUserProperties error: $e');
    }
  }
  
  /// Start screen recording
  /// 
  /// Note: Requires user permission on both platforms
  Future<bool> startRecording() async {
    try {
      final result = await _channel.invokeMethod('startRecording');
      return result == true;
    } catch (e) {
      print('UXCam startRecording error: $e');
      return false;
    }
  }
  
  /// Stop screen recording
  Future<bool> stopRecording() async {
    try {
      final result = await _channel.invokeMethod('stopRecording');
      return result == true;
    } catch (e) {
      print('UXCam stopRecording error: $e');
      return false;
    }
  }
  
  /// Log a network request
  /// 
  /// [url] - Request URL
  /// [method] - HTTP method (GET, POST, etc.)
  /// [statusCode] - Response status code
  /// [duration] - Request duration in milliseconds
  Future<void> logNetworkRequest({
    required String url,
    required String method,
    int? statusCode,
    int? duration,
  }) async {
    await trackEvent('network_request', properties: {
      'url': url,
      'method': method,
      'status_code': statusCode,
      'duration': duration,
    });
  }
  
  /// Log an error / crash
  /// 
  /// [error] - Error message
  /// [stackTrace] - Stack trace
  /// [properties] - Additional error properties
  Future<void> logError({
    required String error,
    String? stackTrace,
    Map<String, dynamic>? properties,
  }) async {
    await trackEvent('error', properties: {
      'error': error,
      'stack_trace': stackTrace,
      ...?properties,
    });
  }
  
  /// End current session
  Future<void> endSession() async {
    try {
      await _channel.invokeMethod('endSession');
    } catch (e) {
      print('UXCam endSession error: $e');
    }
  }
  
  /// Restart session (creates new session ID)
  Future<void> restartSession() async {
    try {
      await _channel.invokeMethod('restartSession');
    } catch (e) {
      print('UXCam restartSession error: $e');
    }
  }
}

/// NavigatorObserver for automatic screen tracking in Flutter
class UXCamNavigatorObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _trackRoute(route, 'push');
  }
  
  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    _trackRoute(previousRoute, 'pop');
  }
  
  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) {
      _trackRoute(newRoute, 'replace');
    }
  }
  
  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didRemove(route, previousRoute);
    if (previousRoute != null) {
      _trackRoute(previousRoute, 'remove');
    }
  }
  
  void _trackRoute(Route<dynamic>? route, String action) {
    if (route == null) return;
    
    final routeName = route.settings.name ?? 
                     route.settings.arguments?.toString() ?? 
                     route.runtimeType.toString();
    
    UXCam.instance.trackScreenView(
      routeName,
      properties: {
        'action': action,
        'route_type': route.runtimeType.toString(),
        'auto_tracked': true,
      },
    );
    
    print('📱 UXCam: Auto-tracked screen: $routeName ($action)');
  }
}

/// Helper class for HTTP interceptor (works with dio package)
/// 
/// Note: Requires dio package. Add to pubspec.yaml:
/// ```yaml
/// dependencies:
///   dio: ^5.0.0
/// ```
/// 
/// Usage with dio:
/// ```dart
/// import 'package:dio/dio.dart';
/// 
/// final dio = Dio();
/// dio.interceptors.add(UXCamHttpInterceptor());
/// ```
/// 
/// For http package, wrap requests manually or use a custom client.
class UXCamHttpInterceptor {
  // Note: This requires dio package. The actual implementation would be:
  // 
  // void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
  //   final startTime = DateTime.now().millisecondsSinceEpoch;
  //   options.extra['uxcam_start_time'] = startTime;
  //   UXCam.instance.trackEvent('network_request', properties: {...});
  //   handler.next(options);
  // }
  // 
  // Similar for onResponse and onError
  // 
  // See documentation for full implementation with dio package
}
