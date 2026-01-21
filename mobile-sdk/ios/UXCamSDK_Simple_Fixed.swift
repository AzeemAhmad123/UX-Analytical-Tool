// Simple UXCam SDK for iOS - COMPLETE FIXED VERSION
// No dependencies needed - uses built-in URLSession

import Foundation
import UIKit

class UXCamSDK {
    static let shared = UXCamSDK()
    private var sdkKey: String?
    private let apiUrl = "https://api.enalyze.123fixit.com"
    private var sessionId = "sess_\(Int64(Date().timeIntervalSince1970 * 1000))_\(UUID().uuidString.prefix(8))"
    
    private init() {
        self.sdkKey = nil
    }
    
    // Initialize with your SDK key (get it from dashboard)
    func initialize(sdkKey: String) {
        self.sdkKey = sdkKey
        // SDK ready!
    }
    
    // Get device info (for backend API)
    private func getDeviceInfo() -> [String: Any] {
        let screen = UIScreen.main.bounds
        let device = UIDevice.current
        
        return [
            "platform": "ios",
            "viewportWidth": Int(screen.width),
            "viewportHeight": Int(screen.height),
            "userAgent": "iOS/\(device.systemVersion)",
            "deviceModel": device.model,
            "systemVersion": device.systemVersion,
            "deviceName": device.name,
            "systemName": device.systemName,
            "identifierForVendor": device.identifierForVendor?.uuidString ?? ""
        ]
    }
    
    func trackEvent(_ eventType: String, properties: [String: Any] = [:]) {
        guard let key = sdkKey else { return }  // Need to initialize first!
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // ✅ FIXED: Include device_info in payload
        let deviceInfo = getDeviceInfo()
        
        let payload: [String: Any] = [
            "sdk_key": key,
            "session_id": sessionId,
            "events": [[
                "type": eventType,
                "timestamp": formatter.string(from: Date()),
                "data": properties
            ]],
            "device_info": deviceInfo  // ✅ Added device_info
        ]
        
        guard let url = URL(string: "\(apiUrl)/api/events/ingest"),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        
        URLSession.shared.dataTask(with: request).resume()
    }
}

// Usage:
// UXCamSDK.shared.initialize(sdkKey: "ux_b56f732d3ae936ebd6e8773f706c54fd")
// UXCamSDK.shared.trackEvent("button_click", properties: ["button_id": "signup"])
