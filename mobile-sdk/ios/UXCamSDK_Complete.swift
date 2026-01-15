//
//  UXCamSDK_Complete.swift
//  Complete UXCam SDK for iOS - All Features
//  Works with: Native iOS, Flutter, React Native
//
//  No dependencies needed - uses built-in URLSession
//

import Foundation
import UIKit
import ObjectiveC.runtime

#if canImport(Darwin)
import Darwin
#elseif canImport(Glibc)
import Glibc
#endif

// Configuration
public struct UXCamConfig {
    let sdkKey: String
    let apiUrl: String
    let enableVideoRecording: Bool
    let enableEventTracking: Bool
    let enableAutomaticTracking: Bool
    
    public init(
        sdkKey: String,
        apiUrl: String = "https://architecture-hormone-specify-bureau.trycloudflare.com",
        enableVideoRecording: Bool = true,
        enableEventTracking: Bool = true,
        enableAutomaticTracking: Bool = true
    ) {
        self.sdkKey = sdkKey
        self.apiUrl = apiUrl
        self.enableVideoRecording = enableVideoRecording
        self.enableEventTracking = enableEventTracking
        self.enableAutomaticTracking = enableAutomaticTracking
    }
    
    // Initializer for Flutter compatibility (without enableAutomaticTracking)
    public init(
        sdkKey: String,
        apiUrl: String,
        enableVideoRecording: Bool,
        enableEventTracking: Bool
    ) {
        self.sdkKey = sdkKey
        self.apiUrl = apiUrl
        self.enableVideoRecording = enableVideoRecording
        self.enableEventTracking = enableEventTracking
        self.enableAutomaticTracking = true
    }
}

// Main SDK Class (Singleton - Required for Flutter/React Native)
public class UXCamSDK {
    public static let shared = UXCamSDK()
    
    private var config: UXCamConfig?
    private var sessionId: String?
    
    // Event batching
    private let eventQueue = DispatchQueue(label: "com.uxcam.events", qos: .utility)
    private var pendingEvents: [[String: Any]] = []
    private let batchSize = 10
    private var batchTimer: Timer?
    
    // Automatic tracking
    private var isAutomaticTrackingEnabled = false
    private var originalUncaughtExceptionHandler: NSUncaughtExceptionHandler?
    private var networkSessionDelegate: UXCamURLSessionDelegate?
    private static var hasSwizzledViewControllers = false
    
    private init() {}
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    public func initialize(config: UXCamConfig) {
        self.config = config
        self.sessionId = "sess_\(Int64(Date().timeIntervalSince1970 * 1000))_\(UUID().uuidString.prefix(8))"
        
        print("🎬 UXCam SDK initialized")
        print("   SDK Key: \(config.sdkKey.prefix(10))...")
        print("   API URL: \(config.apiUrl)")
        print("   Session ID: \(sessionId ?? "none")")
        
        // Start session
        trackEvent("session_start", properties: [
            "session_id": sessionId ?? "",
            "sdk_version": "1.0.0"
        ])
        
        // Start batch timer
        startBatchTimer()
        
        // Setup automatic tracking
        if (config.enableAutomaticTracking && config.enableEventTracking) {
            setupAutomaticTracking()
        }
    }
    
    // Simple initialize (backward compatible)
    public func initialize(sdkKey: String) {
        let config = UXCamConfig(
            sdkKey: sdkKey,
            apiUrl: "https://architecture-hormone-specify-bureau.trycloudflare.com"
        )
        initialize(config: config)
    }
    
    // ============================================
    // AUTOMATIC TRACKING
    // ============================================
    
    private func setupAutomaticTracking() {
        guard let config = config, config.enableEventTracking else { return }
        
        setupScreenTracking()
        setupNetworkTracking()
        setupCrashTracking()
        
        isAutomaticTrackingEnabled = true
        print("✅ Automatic tracking enabled")
    }
    
    private func setupScreenTracking() {
        guard !UXCamSDK.hasSwizzledViewControllers else { return }
        
        let originalSelector = #selector(UIViewController.viewDidAppear(_:))
        let swizzledSelector = #selector(UIViewController.uxcam_viewDidAppear(_:))
        
        guard let originalMethod = class_getInstanceMethod(UIViewController.self, originalSelector),
              let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzledSelector) else {
            return
        }
        
        let didAddMethod = class_addMethod(
            UIViewController.self,
            originalSelector,
            method_getImplementation(swizzledMethod),
            method_getTypeEncoding(swizzledMethod)
        )
        
        if didAddMethod {
            class_replaceMethod(
                UIViewController.self,
                swizzledSelector,
                method_getImplementation(originalMethod),
                method_getTypeEncoding(originalMethod)
            )
        } else {
            method_exchangeImplementations(originalMethod, swizzledMethod)
        }
        
        UXCamSDK.hasSwizzledViewControllers = true
    }
    
    private func setupNetworkTracking() {
        networkSessionDelegate = UXCamURLSessionDelegate(sdk: self)
        print("✅ Network tracking delegate created")
    }
    
    public func getNetworkSession() -> URLSession {
        let config = URLSessionConfiguration.default
        let delegate = UXCamURLSessionDelegate(sdk: self)
        networkSessionDelegate = delegate
        return URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
    }
    
    private func setupCrashTracking() {
        originalUncaughtExceptionHandler = NSGetUncaughtExceptionHandler()
        
        NSSetUncaughtExceptionHandler { exception in
            UXCamSDK.shared.trackEvent("crash", properties: [
                "error": exception.name.rawValue,
                "reason": exception.reason ?? "Unknown",
                "stack_trace": exception.callStackSymbols.joined(separator: "\n"),
                "auto_tracked": true
            ])
            UXCamSDK.shared.flushEvents()
            print("💥 Crash detected and tracked")
            UXCamSDK.shared.originalUncaughtExceptionHandler?(exception)
        }
        
        signal(SIGABRT, signalHandler)
        signal(SIGILL, signalHandler)
        signal(SIGSEGV, signalHandler)
        signal(SIGFPE, signalHandler)
        signal(SIGBUS, signalHandler)
        signal(SIGPIPE, signalHandler)
    }
    
    private func signalHandler(signal: Int32) {
        let signalName: String
        switch signal {
        case SIGABRT: signalName = "SIGABRT"
        case SIGILL: signalName = "SIGILL"
        case SIGSEGV: signalName = "SIGSEGV"
        case SIGFPE: signalName = "SIGFPE"
        case SIGBUS: signalName = "SIGBUS"
        case SIGPIPE: signalName = "SIGPIPE"
        default: signalName = "UNKNOWN"
        }
        
        trackEvent("crash", properties: [
            "error": "Signal \(signalName)",
            "signal": signal,
            "auto_tracked": true
        ])
        flushEvents()
        signal(signal, SIG_DFL)
        raise(signal)
    }
    
    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    public func getSessionId() -> String? {
        return sessionId
    }
    
    public func endSession() {
        trackEvent("session_end", properties: [
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
        ])
        flushEvents()
        sessionId = nil
    }
    
    public func restartSession() {
        endSession()
        sessionId = "sess_\(Int64(Date().timeIntervalSince1970 * 1000))_\(UUID().uuidString.prefix(8))"
        trackEvent("session_start", properties: [
            "session_id": sessionId ?? "",
            "sdk_version": "1.0.0"
        ])
    }
    
    // ============================================
    // EVENT TRACKING
    // ============================================
    
    public func trackEvent(_ eventType: String, properties: [String: Any] = [:]) {
        guard let config = config, config.enableEventTracking else { return }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let event: [String: Any] = [
            "type": eventType,
            "timestamp": formatter.string(from: Date()),
            "data": properties
        ]
        
        eventQueue.async { [weak self] in
            self?.pendingEvents.append(event)
            if self?.pendingEvents.count ?? 0 >= self?.batchSize ?? 10 {
                self?.flushEvents()
            }
        }
    }
    
    public func trackPageView(_ page: String, properties: [String: Any] = [:]) {
        var props = properties
        props["page"] = page
        trackEvent("page_view", properties: props)
    }
    
    public func trackButtonClick(_ buttonId: String, properties: [String: Any] = [:]) {
        var props = properties
        props["button_id"] = buttonId
        trackEvent("button_click", properties: props)
    }
    
    public func trackFormSubmit(_ formId: String, properties: [String: Any] = [:]) {
        var props = properties
        props["form_id"] = formId
        trackEvent("form_submit", properties: props)
    }
    
    public func setUserProperties(userId: String?, properties: [String: Any]) {
        trackEvent("user_properties_updated", properties: [
            "user_id": userId ?? "",
            "properties": properties
        ])
    }
    
    // ============================================
    // EVENT BATCHING & FLUSHING
    // ============================================
    
    private func startBatchTimer() {
        batchTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.flushEvents()
        }
    }
    
    public func flushEvents() {
        guard !pendingEvents.isEmpty, let config = config, let sessionId = sessionId else { return }
        
        let eventsToSend = pendingEvents
        pendingEvents.removeAll()
        
        sendEvents(eventsToSend)
    }
    
    private func sendEvents(_ events: [[String: Any]]) {
        guard let config = config, let sessionId = sessionId else { return }
        
        let deviceInfo = getDeviceInfo()
        
        let payload: [String: Any] = [
            "sdk_key": config.sdkKey,
            "session_id": sessionId,
            "events": events,
            "device_info": deviceInfo
        ]
        
        guard let url = URL(string: "\(config.apiUrl)/api/events/ingest"),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        request.httpBody = body
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Error sending events: \(error.localizedDescription)")
                self.eventQueue.async {
                    self.pendingEvents.insert(contentsOf: events, at: 0)
                }
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    print("✅ Sent \(events.count) events successfully")
                } else {
                    print("⚠️ Server returned status: \(httpResponse.statusCode)")
                    self.eventQueue.async {
                        self.pendingEvents.insert(contentsOf: events, at: 0)
                    }
                }
            }
        }.resume()
    }
    
    // ============================================
    // DEVICE INFO
    // ============================================
    
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
    
    // ============================================
    // CLEANUP
    // ============================================
    
    deinit {
        batchTimer?.invalidate()
        flushEvents()
        
        if let originalHandler = originalUncaughtExceptionHandler {
            NSSetUncaughtExceptionHandler(originalHandler)
        }
    }
    
    // Video recording stubs (for Flutter compatibility)
    public func startVideoRecording() {
        // Placeholder - video recording not implemented in simple version
    }
    
    public func stopVideoRecording() {
        // Placeholder - video recording not implemented in simple version
    }
    
    public func stopVideoRecording(completion: ((Bool) -> Void)?) {
        completion?(false)
    }
}

// UIViewController Extension for Automatic Screen Tracking
extension UIViewController {
    @objc func uxcam_viewDidAppear(_ animated: Bool) {
        uxcam_viewDidAppear(animated)
        let screenName = String(describing: type(of: self))
        UXCamSDK.shared.trackPageView(screenName, properties: [
            "view_controller": screenName,
            "title": title ?? "",
            "auto_tracked": true
        ])
    }
}

// URLSessionDelegate for Automatic Network Tracking
class UXCamURLSessionDelegate: NSObject, URLSessionDelegate, URLSessionTaskDelegate {
    weak var sdk: UXCamSDK?
    
    init(sdk: UXCamSDK) {
        self.sdk = sdk
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let request = task.originalRequest, let url = request.url else { return }
        
        if let error = error {
            sdk?.trackEvent("network_error", properties: [
                "url": url.absoluteString,
                "method": request.httpMethod ?? "GET",
                "error": error.localizedDescription,
                "auto_tracked": true
            ])
        } else if let response = task.response as? HTTPURLResponse {
            sdk?.trackEvent("network_response", properties: [
                "url": url.absoluteString,
                "method": request.httpMethod ?? "GET",
                "status_code": response.statusCode,
                "success": (200...299).contains(response.statusCode),
                "auto_tracked": true
            ])
        }
    }
}
