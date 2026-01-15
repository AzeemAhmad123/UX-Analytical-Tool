import Flutter
import UIKit

public class UXCamFlutterPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "com.uxcam.flutter/sdk", binaryMessenger: registrar.messenger())
    let instance = UXCamFlutterPlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "initialize":
      guard let args = call.arguments as? [String: Any],
            let sdkKey = args["sdkKey"] as? String else {
        result(FlutterError(code: "INVALID_ARGUMENT", message: "sdkKey is required", details: nil))
        return
      }
      
      let apiUrl = args["apiUrl"] as? String ?? "https://architecture-hormone-specify-bureau.trycloudflare.com"
      let enableVideoRecording = args["enableVideoRecording"] as? Bool ?? true
      let enableEventTracking = args["enableEventTracking"] as? Bool ?? true
      let enableAutomaticTracking = args["enableAutomaticTracking"] as? Bool ?? true
      
      let config = UXCamConfig(
        sdkKey: sdkKey,
        apiUrl: apiUrl,
        enableEventTracking: enableEventTracking,
        enableAutomaticTracking: enableAutomaticTracking
      )
      
      UXCamSDK.shared.initialize(config: config)
      result(true)
      
    case "getSessionId":
      result(UXCamSDK.shared.getSessionId())
      
    case "trackScreenView":
      guard let args = call.arguments as? [String: Any],
            let screenName = args["screenName"] as? String else {
        result(FlutterError(code: "INVALID_ARGUMENT", message: "screenName is required", details: nil))
        return
      }
      let properties = args["properties"] as? [String: Any] ?? [:]
      UXCamSDK.shared.trackPageView(screenName, properties: properties)
      result(true)
      
    case "trackEvent":
      guard let args = call.arguments as? [String: Any],
            let eventName = args["eventName"] as? String else {
        result(FlutterError(code: "INVALID_ARGUMENT", message: "eventName is required", details: nil))
        return
      }
      let properties = args["properties"] as? [String: Any] ?? [:]
      UXCamSDK.shared.trackEvent(eventName, properties: properties)
      result(true)
      
    case "setUserProperties":
      guard let args = call.arguments as? [String: Any] else {
        result(FlutterError(code: "INVALID_ARGUMENT", message: "Invalid arguments", details: nil))
        return
      }
      let userId = args["user_id"] as? String
      let properties = args["properties"] as? [String: Any] ?? [:]
      UXCamSDK.shared.setUserProperties(userId: userId, properties: properties)
      result(true)
      
    case "startRecording":
      UXCamSDK.shared.startVideoRecording()
      result(true)
      
    case "stopRecording":
      UXCamSDK.shared.stopVideoRecording { success in
        result(success)
      }
      
    case "endSession":
      UXCamSDK.shared.endSession()
      result(true)
      
    case "restartSession":
      UXCamSDK.shared.restartSession()
      result(true)
      
    default:
      result(FlutterMethodNotImplemented)
    }
  }
}
