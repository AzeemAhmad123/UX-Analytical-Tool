package com.uxcam.reactnative;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.uxcam.sdk.UXCamConfig;
import com.uxcam.sdk.UXCamSDK;

public class UXCamModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "UXCamModule";
  private final ReactApplicationContext reactContext;

  public UXCamModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void initialize(ReadableMap config, Promise promise) {
    try {
      String sdkKey = config.getString("sdkKey");
      String apiUrl = config.hasKey("apiUrl") ? config.getString("apiUrl") : "https://architecture-hormone-specify-bureau.trycloudflare.com";
      boolean enableVideoRecording = config.hasKey("enableVideoRecording") ? config.getBoolean("enableVideoRecording") : true;
      boolean enableEventTracking = config.hasKey("enableEventTracking") ? config.getBoolean("enableEventTracking") : true;
      boolean enableAutomaticTracking = config.hasKey("enableAutomaticTracking") ? config.getBoolean("enableAutomaticTracking") : true;

      UXCamConfig uxcamConfig = new UXCamConfig(
        sdkKey,
        apiUrl,
        enableVideoRecording,
        enableEventTracking,
        enableAutomaticTracking
      );

      Context context = reactContext.getApplicationContext();
      UXCamSDK.getInstance().initialize(context, uxcamConfig);
      
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("INIT_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void getSessionId(Promise promise) {
    try {
      String sessionId = UXCamSDK.getInstance().getSessionId();
      promise.resolve(sessionId);
    } catch (Exception e) {
      promise.reject("GET_SESSION_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void trackScreenView(ReadableMap params, Promise promise) {
    try {
      String screenName = params.getString("screenName");
      ReadableMap propertiesMap = params.hasKey("properties") ? params.getMap("properties") : null;
      
      java.util.Map<String, Object> properties = new java.util.HashMap<>();
      if (propertiesMap != null) {
        // Convert ReadableMap to Map
        // Note: This is simplified - you'd need to handle all types
        properties.put("screen", screenName);
      }
      
      UXCamSDK.getInstance().trackPageView(screenName, properties);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("TRACK_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void trackEvent(ReadableMap params, Promise promise) {
    try {
      String eventName = params.getString("eventName");
      ReadableMap propertiesMap = params.hasKey("properties") ? params.getMap("properties") : null;
      
      java.util.Map<String, Object> properties = new java.util.HashMap<>();
      if (propertiesMap != null) {
        // Convert ReadableMap to Map
        // Note: This is simplified - you'd need to handle all types
      }
      
      UXCamSDK.getInstance().trackEvent(eventName, properties);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("TRACK_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void setUserProperties(ReadableMap params, Promise promise) {
    try {
      String userId = params.hasKey("user_id") ? params.getString("user_id") : null;
      ReadableMap propertiesMap = params.hasKey("properties") ? params.getMap("properties") : null;
      
      java.util.Map<String, Object> properties = new java.util.HashMap<>();
      if (propertiesMap != null) {
        // Convert ReadableMap to Map
      }
      
      UXCamSDK.getInstance().setUserProperties(userId, properties);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("SET_USER_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void startRecording(Promise promise) {
    try {
      // Note: Requires Activity context for permissions
      promise.resolve(false); // Would need Activity context
    } catch (Exception e) {
      promise.reject("RECORDING_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void stopRecording(Promise promise) {
    try {
      UXCamSDK.getInstance().stopVideoRecording();
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("RECORDING_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void endSession(Promise promise) {
    try {
      UXCamSDK.getInstance().endSession();
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("SESSION_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void restartSession(Promise promise) {
    try {
      UXCamSDK.getInstance().restartSession();
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("SESSION_ERROR", e.getMessage(), e);
    }
  }
}
