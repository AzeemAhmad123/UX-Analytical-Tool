//
//  UXCamSDK_Simple_Improved.swift
//  Simple UXCam SDK for iOS (Flutter Compatible + Backend Compatible)
//
//  Based on your simple code, improved for:
//  1. Flutter compatibility
//  2. Backend API compatibility
//  3. Device info tracking
//

import Foundation
import UIKit

// Configuration
public struct UXCamConfig {
    let sdkKey: String
    let apiUrl: String
    let enableEventTracking: Bool
    
    public init(
        sdkKey: String,
        apiUrl: String = "https://architecture-hormone-specify-bureau.trycloudflare.com",
        enableEventTracking: Bool = true
    ) {
        self.sdkKey = sdkKey
        self.apiUrl = apiUrl
        self.enableEventTracking = enableEventTracking
    }
}

// Main SDK Class (Singleton Pattern - Required for Flutter)
public class UXCamSDK {
    public static let shared = UXCamSDK()
    
    private var config: UXCamConfig?
    private var sessionId: String?
    
    private init() {}
    
    // Initialize (Flutter plugin calls this)
    public func initialize(config: UXCamConfig) {
        self.config = config
        self.sessionId = "sess_\(Int64(Date().timeIntervalSince1970 * 1000))_\(UUID().uuidString.prefix(8))"
        
        // Send session start event
        trackEvent("session_start", properties: [
            "session_id": sessionId ?? "",
            "sdk_version": "1.0.0"
        ])
    }
    
    // Simple initialize (for your original code style)
    public func initialize(sdkKey: String) {
        let config = UXCamConfig(
            sdkKey: sdkKey,
            apiUrl: "https://architecture-hormone-specify-bureau.trycloudflare.com"
        )
        initialize(config: config)
    }
    
    // Get session ID (Flutter plugin needs this)
    public func getSessionId() -> String? {
        return sessionId
    }
    
    // Get device info (for backend API)
    private func getDeviceInfo() -> [String: Any] {
        let screen = UIScreen.main.bounds
        return [
            "viewportWidth": Int(screen.width),
            "viewportHeight": Int(screen.height),
            "userAgent": "iOS/\(UIDevice.current.systemVersion)",
            "platform": "ios",
            "deviceModel": UIDevice.current.model,
            "systemVersion": UIDevice.current.systemVersion
        ]
    }
    
    // Track event (Your original code, improved)
    public func trackEvent(_ eventType: String, properties: [String: Any] = [:]) {
        guard let config = config, let sessionId = sessionId else { return }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // Include device_info for backend compatibility
        let deviceInfo = getDeviceInfo()
        
        let payload: [String: Any] = [
            "sdk_key": config.sdkKey,
            "session_id": sessionId,
            "events": [[
                "type": eventType,
                "timestamp": formatter.string(from: Date()),
                "data": properties
            ]],
            "device_info": deviceInfo
        ]
        
        guard let url = URL(string: "\(config.apiUrl)/api/events/ingest"),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        
        URLSession.shared.dataTask(with: request).resume()
    }
    
    // Track page view (Flutter plugin needs this)
    public func trackPageView(_ page: String, properties: [String: Any] = [:]) {
        var props = properties
        props["page"] = page
        trackEvent("page_view", properties: props)
    }
    
    // Set user properties (Flutter plugin needs this)
    public func setUserProperties(userId: String?, properties: [String: Any]) {
        trackEvent("user_properties_updated", properties: [
            "user_id": userId ?? "",
            "properties": properties
        ])
    }
    
    // End session (Flutter plugin needs this)
    public func endSession() {
        trackEvent("session_end", properties: [
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
        ])
        sessionId = nil
    }
    
    // Restart session (Flutter plugin needs this)
    public func restartSession() {
        endSession()
        sessionId = "sess_\(Int64(Date().timeIntervalSince1970 * 1000))_\(UUID().uuidString.prefix(8))"
        trackEvent("session_start", properties: [
            "session_id": sessionId ?? "",
            "sdk_version": "1.0.0"
        ])
    }
    
    // Stop video recording (Flutter plugin needs this - stub for simple version)
    public func stopVideoRecording() {
        // Placeholder - video recording not implemented in simple version
    }
}

// Usage Examples:
//
// Native iOS (Your original style):
// UXCamSDK.shared.initialize(sdkKey: "ux_7a79663089204da4d3c29e93b16b63fb")
// UXCamSDK.shared.trackEvent("button_click", properties: ["button_id": "signup"])
//
// Flutter (via plugin):
// UXCam.instance.initialize(sdkKey: 'ux_7a79663089204da4d3c29e93b16b63fb')
// UXCam.instance.trackEvent('button_click', properties: {'button_id': 'signup'})
