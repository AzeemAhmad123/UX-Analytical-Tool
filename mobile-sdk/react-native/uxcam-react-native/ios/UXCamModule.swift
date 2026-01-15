//
//  UXCamModule.swift
//  UXCam React Native Module for iOS
//
//  Created for UXCam Analytics Platform
//

import Foundation
import UIKit

@objc(UXCamModule)
class UXCamModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // Import React Native bridge
  // Note: In actual React Native project, this would be:
  // import React
  // and class would conform to RCTBridgeModule
  
  @objc
  func initialize(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let sdkKey = config["sdkKey"] as? String else {
      reject("INVALID_ARGUMENT", "sdkKey is required", nil)
      return
    }
    
    let apiUrl = config["apiUrl"] as? String ?? "https://architecture-hormone-specify-bureau.trycloudflare.com"
    let enableEventTracking = config["enableEventTracking"] as? Bool ?? true
    let enableAutomaticTracking = config["enableAutomaticTracking"] as? Bool ?? true
    
    let uxcamConfig = UXCamConfig(
      sdkKey: sdkKey,
      apiUrl: apiUrl,
      enableEventTracking: enableEventTracking,
      enableAutomaticTracking: enableAutomaticTracking
    )
    
    UXCamSDK.shared.initialize(config: uxcamConfig)
    resolve(true)
  }
  
  @objc
  func getSessionId(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let sessionId = UXCamSDK.shared.getSessionId()
    resolve(sessionId)
  }
  
  @objc
  func trackScreenView(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let screenName = params["screenName"] as? String else {
      reject("INVALID_ARGUMENT", "screenName is required", nil)
      return
    }
    
    let properties = params["properties"] as? [String: Any] ?? [:]
    UXCamSDK.shared.trackPageView(page: screenName, properties: properties)
    resolve(true)
  }
  
  @objc
  func trackEvent(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let eventName = params["eventName"] as? String else {
      reject("INVALID_ARGUMENT", "eventName is required", nil)
      return
    }
    
    let properties = params["properties"] as? [String: Any] ?? [:]
    UXCamSDK.shared.trackEvent(eventName, properties: properties)
    resolve(true)
  }
  
  @objc
  func setUserProperties(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let userId = params["user_id"] as? String
    let properties = params["properties"] as? [String: Any] ?? [:]
    
    UXCamSDK.shared.setUserProperties(userId: userId, properties: properties)
    resolve(true)
  }
  
  @objc
  func startRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UXCamSDK.shared.startVideoRecording()
    resolve(true)
  }
  
  @objc
  func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UXCamSDK.shared.stopVideoRecording { success in
      resolve(success)
    }
  }
  
  @objc
  func endSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UXCamSDK.shared.endSession()
    resolve(true)
  }
  
  @objc
  func restartSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UXCamSDK.shared.restartSession()
    resolve(true)
  }
}

// Note: In actual React Native project setup:
// 1. Add React Native framework import: import React
// 2. RCTPromiseResolveBlock and RCTPromiseRejectBlock are provided by React Native
// 3. The UXCamModule.m file provides the Objective-C bridge to React Native
// 4. This Swift file connects to UXCamSDK.swift (native iOS SDK)
