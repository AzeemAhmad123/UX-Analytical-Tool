//
//  UXCamSDK.swift
//  UXCam Analytics SDK for iOS
//
//  Created for UXCam Analytics Platform
//  Supports local testing with http://YOUR_IP:3001
//

import Foundation
import UIKit
import ReplayKit

// MARK: - Configuration
public struct UXCamConfig {
    let sdkKey: String
    let apiUrl: String
    let enableVideoRecording: Bool
    let enableEventTracking: Bool
    
    public init(
        sdkKey: String,
        apiUrl: String = "https://your-backend-url.com",
        enableVideoRecording: Bool = true,
        enableEventTracking: Bool = true
    ) {
        self.sdkKey = sdkKey
        self.apiUrl = apiUrl
        self.enableVideoRecording = enableVideoRecording
        self.enableEventTracking = enableEventTracking
    }
}

// MARK: - Event Model
public struct UXCamEvent {
    let type: String
    let timestamp: Date
    let data: [String: Any]
    
    func toDictionary() -> [String: Any] {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        return [
            "type": type,
            "timestamp": formatter.string(from: timestamp),
            "data": data
        ]
    }
}

// MARK: - Device Info
struct DeviceInfo {
    static func get() -> [String: Any] {
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
}

// MARK: - UXCam SDK Main Class
public class UXCamSDK {
    public static let shared = UXCamSDK()
    
    private var config: UXCamConfig?
    private var sessionId: String?
    private var isRecording = false
    private var recorder: RPScreenRecorder?
    private var videoOutputURL: URL?
    private var recordingStartTime: Date?
    
    private let eventQueue = DispatchQueue(label: "com.uxcam.events", qos: .utility)
    private var pendingEvents: [UXCamEvent] = []
    private let batchSize = 10
    private var batchTimer: Timer?
    
    private init() {}
    
    // MARK: - Initialization
    public func initialize(config: UXCamConfig) {
        self.config = config
        self.sessionId = generateSessionId()
        
        print("🎬 UXCam SDK initialized")
        print("   SDK Key: \(config.sdkKey.prefix(10))...")
        print("   API URL: \(config.apiUrl)")
        print("   Session ID: \(sessionId ?? "none")")
        
        // Start session
        startSession()
        
        // Start batch timer
        startBatchTimer()
    }
    
    // MARK: - Session Management
    private func generateSessionId() -> String {
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        let random = UUID().uuidString.prefix(8)
        return "sess_\(timestamp)_\(random)"
    }
    
    private func startSession() {
        guard let config = config, let sessionId = sessionId else { return }
        
        // Send session start event
        trackEvent("session_start", properties: [
            "session_id": sessionId,
            "sdk_version": "1.0.0"
        ])
    }
    
    // MARK: - Event Tracking
    public func trackEvent(_ type: String, properties: [String: Any] = [:]) {
        guard let config = config, config.enableEventTracking else { return }
        
        let event = UXCamEvent(
            type: type,
            timestamp: Date(),
            data: properties
        )
        
        eventQueue.async { [weak self] in
            self?.pendingEvents.append(event)
            self?.flushEventsIfNeeded()
        }
    }
    
    // Convenience methods
    public func trackPageView(page: String, properties: [String: Any] = [:]) {
        var props = properties
        props["page"] = page
        trackEvent("page_view", properties: props)
    }
    
    public func trackButtonClick(buttonId: String, properties: [String: Any] = [:]) {
        var props = properties
        props["button_id"] = buttonId
        trackEvent("button_click", properties: props)
    }
    
    public func trackFormSubmit(formId: String, properties: [String: Any] = [:]) {
        var props = properties
        props["form_id"] = formId
        trackEvent("form_submit", properties: props)
    }
    
    // MARK: - Event Batching & Flushing
    private func startBatchTimer() {
        batchTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.flushEvents()
        }
    }
    
    private func flushEventsIfNeeded() {
        if pendingEvents.count >= batchSize {
            flushEvents()
        }
    }
    
    private func flushEvents() {
        guard !pendingEvents.isEmpty, let config = config, let sessionId = sessionId else { return }
        
        let eventsToSend = pendingEvents
        pendingEvents.removeAll()
        
        sendEvents(eventsToSend)
    }
    
    private func sendEvents(_ events: [UXCamEvent]) {
        guard let config = config, let sessionId = sessionId else { return }
        
        let eventDicts = events.map { $0.toDictionary() }
        
        let payload: [String: Any] = [
            "sdk_key": config.sdkKey,
            "session_id": sessionId,
            "events": eventDicts,
            "device_info": DeviceInfo.get()
        ]
        
        guard let url = URL(string: "\(config.apiUrl)/api/events/ingest") else {
            print("❌ Invalid API URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            print("❌ Error serializing events: \(error)")
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Error sending events: \(error.localizedDescription)")
                // Re-add events to queue on failure
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
    
    // MARK: - Video Recording
    public func startVideoRecording() {
        guard let config = config, config.enableVideoRecording else {
            print("⚠️ Video recording is disabled")
            return
        }
        
        guard !isRecording else {
            print("⚠️ Recording already in progress")
            return
        }
        
        recorder = RPScreenRecorder.shared()
        
        guard recorder?.isAvailable == true else {
            print("❌ Screen recording not available")
            return
        }
        
        // Create temporary file for recording
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let videoPath = documentsPath.appendingPathComponent("uxcam_recording_\(UUID().uuidString).mp4")
        videoOutputURL = videoPath
        
        recordingStartTime = Date()
        isRecording = true
        
        recorder?.startRecording { [weak self] error in
            if let error = error {
                print("❌ Failed to start recording: \(error.localizedDescription)")
                self?.isRecording = false
                self?.recordingStartTime = nil
            } else {
                print("🎥 Started video recording")
                self?.trackEvent("video_recording_started", properties: [:])
            }
        }
    }
    
    public func stopVideoRecording(completion: ((Bool) -> Void)? = nil) {
        guard isRecording, let recorder = recorder else {
            print("⚠️ No recording in progress")
            completion?(false)
            return
        }
        
        recorder.stopRecording { [weak self] error in
            guard let self = self else {
                completion?(false)
                return
            }
            
            self.isRecording = false
            
            if let error = error {
                print("❌ Failed to stop recording: \(error.localizedDescription)")
                completion?(false)
                return
            }
            
            guard let videoURL = self.videoOutputURL,
                  let startTime = self.recordingStartTime else {
                print("❌ Missing video URL or start time")
                completion?(false)
                return
            }
            
            let duration = Date().timeIntervalSince(startTime) * 1000 // milliseconds
            
            print("🎥 Stopped video recording (duration: \(Int(duration))ms)")
            self.trackEvent("video_recording_stopped", properties: [
                "duration": Int(duration)
            ])
            
            // Upload video
            self.uploadVideo(videoURL: videoURL, duration: duration, completion: completion)
        }
    }
    
    // MARK: - Video Upload
    private func uploadVideo(videoURL: URL, duration: TimeInterval, completion: ((Bool) -> Void)? = nil) {
        guard let config = config, let sessionId = sessionId else {
            completion?(false)
            return
        }
        
        guard let videoData = try? Data(contentsOf: videoURL) else {
            print("❌ Failed to read video file")
            completion?(false)
            return
        }
        
        let fileSize = videoData.count
        print("📤 Uploading video (\(fileSize) bytes)...")
        
        guard let url = URL(string: "\(config.apiUrl)/api/videos/upload") else {
            print("❌ Invalid API URL")
            completion?(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // SDK Key
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"sdk_key\"\r\n\r\n".data(using: .utf8)!)
        body.append(config.sdkKey.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        // Session ID
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"session_id\"\r\n\r\n".data(using: .utf8)!)
        body.append(sessionId.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        // Duration
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"duration\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(Int(duration))".data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        // Video file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"video\"; filename=\"recording.mp4\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: video/mp4\r\n\r\n".data(using: .utf8)!)
        body.append(videoData)
        body.append("\r\n".data(using: .utf8)!)
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Error uploading video: \(error.localizedDescription)")
                completion?(false)
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    print("✅ Video uploaded successfully")
                    // Clean up local file
                    try? FileManager.default.removeItem(at: videoURL)
                    completion?(true)
                } else {
                    print("⚠️ Server returned status: \(httpResponse.statusCode)")
                    if let data = data, let responseString = String(data: data, encoding: .utf8) {
                        print("   Response: \(responseString)")
                    }
                    completion?(false)
                }
            }
        }.resume()
    }
    
    // MARK: - Cleanup
    public func flush() {
        flushEvents()
    }
    
    deinit {
        batchTimer?.invalidate()
        if isRecording {
            stopVideoRecording()
        }
        flushEvents()
    }
}

