//
//  UXCamSDK+Example.swift
//  Example Usage of UXCam SDK for iOS
//

import UIKit

// MARK: - Example: AppDelegate Setup
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Initialize UXCam SDK
        // For local testing, use your computer's IP address
        // Example: http://192.168.1.100:3001
        let config = UXCamConfig(
            sdkKey: "ux_your_sdk_key_here", // Get from dashboard
            apiUrl: "http://192.168.1.100:3001", // Your local IP
            enableVideoRecording: true,
            enableEventTracking: true
        )
        
        UXCamSDK.shared.initialize(config: config)
        
        return true
    }
}

// MARK: - Example: ViewController Usage
class ViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Track page view
        UXCamSDK.shared.trackPageView(page: "home")
    }
    
    @IBAction func signupButtonTapped(_ sender: UIButton) {
        // Track button click
        UXCamSDK.shared.trackButtonClick(
            buttonId: "signup",
            properties: [
                "button_text": sender.titleLabel?.text ?? "",
                "screen": "home"
            ]
        )
        
        // Your signup logic here
    }
    
    @IBAction func startRecordingTapped(_ sender: UIButton) {
        // Start video recording
        UXCamSDK.shared.startVideoRecording()
    }
    
    @IBAction func stopRecordingTapped(_ sender: UIButton) {
        // Stop video recording
        UXCamSDK.shared.stopVideoRecording { success in
            if success {
                print("✅ Video uploaded successfully")
            } else {
                print("❌ Video upload failed")
            }
        }
    }
    
    func submitForm() {
        // Track form submission
        UXCamSDK.shared.trackFormSubmit(
            formId: "contact",
            properties: [
                "form_type": "contact",
                "fields_count": 5
            ]
        )
    }
    
    // Track custom events
    func trackCustomEvent() {
        UXCamSDK.shared.trackEvent("custom_action", properties: [
            "action_type": "purchase",
            "amount": 99.99,
            "currency": "USD"
        ])
    }
}

// MARK: - Example: Complete Funnel Tracking
class FunnelExample {
    
    func trackFunnelSteps() {
        // Step 1: Page View
        UXCamSDK.shared.trackPageView(page: "home")
        
        // Step 2: Button Click
        UXCamSDK.shared.trackButtonClick(buttonId: "signup")
        
        // Step 3: Form Submit
        UXCamSDK.shared.trackFormSubmit(formId: "signup_form")
        
        // Step 4: Custom Event
        UXCamSDK.shared.trackEvent("signup_completed", properties: [
            "plan": "premium",
            "source": "mobile_app"
        ])
    }
}

