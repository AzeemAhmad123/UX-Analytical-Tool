package com.uxcam.flutter

import android.content.Context
import com.uxcam.sdk.UXCamConfig
import com.uxcam.sdk.UXCamSDK
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/** UXCamFlutterPlugin */
class UXCamFlutterPlugin: FlutterPlugin, MethodChannel.MethodCallHandler {
  private lateinit var channel : MethodChannel
  private var context: Context? = null

  override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
    channel = MethodChannel(flutterPluginBinding.binaryMessenger, "com.uxcam.flutter/sdk")
    channel.setMethodCallHandler(this)
    context = flutterPluginBinding.applicationContext
  }

  override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
    when (call.method) {
      "initialize" -> {
        val sdkKey = call.argument<String>("sdkKey") ?: run {
          result.error("INVALID_ARGUMENT", "sdkKey is required", null)
          return
        }
        val apiUrl = call.argument<String>("apiUrl") ?: "https://uxcam-backend.vercel.app"
        val enableVideoRecording = call.argument<Boolean>("enableVideoRecording") ?: true
        val enableEventTracking = call.argument<Boolean>("enableEventTracking") ?: true
        
        val config = UXCamConfig(
          sdkKey = sdkKey,
          apiUrl = apiUrl,
          enableVideoRecording = enableVideoRecording,
          enableEventTracking = enableEventTracking,
          enableAutomaticTracking = call.argument<Boolean>("enableAutomaticTracking") ?: true
        )
        
        val ctx = context
        if (ctx != null) {
          UXCamSDK.getInstance().initialize(ctx, config)
          result.success(true)
        } else {
          result.error("INIT_ERROR", "Context not available", null)
        }
      }
      
      "getSessionId" -> {
        // Get session ID from native SDK
        // Note: You'll need to expose this method in UXCamSDK.kt
        result.success(UXCamSDK.getInstance().getSessionId())
      }
      
      "trackScreenView" -> {
        val screenName = call.argument<String>("screenName") ?: ""
        val properties = call.argument<Map<String, Any>>("properties") ?: emptyMap()
        
        UXCamSDK.getInstance().trackPageView(screenName, properties)
        result.success(true)
      }
      
      "trackEvent" -> {
        val eventName = call.argument<String>("eventName") ?: ""
        val properties = call.argument<Map<String, Any>>("properties") ?: emptyMap()
        
        UXCamSDK.getInstance().trackEvent(eventName, properties)
        result.success(true)
      }
      
      "setUserProperties" -> {
        val userId = call.argument<String>("user_id")
        val properties = call.argument<Map<String, Any>>("properties") ?: emptyMap()
        
        // Set user properties in native SDK
        // Note: You'll need to add this method to UXCamSDK.kt
        UXCamSDK.getInstance().setUserProperties(userId, properties)
        result.success(true)
      }
      
      "startRecording" -> {
        val ctx = context
        if (ctx != null) {
          // Start recording - requires activity context for permission
          // Note: This needs to be called from an Activity, not Application context
          result.success(false) // Would need Activity context
        } else {
          result.error("CONTEXT_ERROR", "Context not available", null)
        }
      }
      
      "stopRecording" -> {
        UXCamSDK.getInstance().stopVideoRecording()
        result.success(true)
      }
      
      "endSession" -> {
        UXCamSDK.getInstance().endSession()
        result.success(true)
      }
      
      "restartSession" -> {
        UXCamSDK.getInstance().restartSession()
        result.success(true)
      }
      
      else -> {
        result.notImplemented()
      }
    }
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel.setMethodCallHandler(null)
    context = null
  }
}
