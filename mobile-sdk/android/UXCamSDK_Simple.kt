//
//  UXCamSDK_Simple.kt
//  Simple UXCam SDK for Android (Flutter Compatible)
//
//  This is a simplified version that works with Flutter
//  Based on your provided code, adapted for Flutter plugin compatibility
//

package com.uxcam.sdk

import android.app.Application
import android.content.Context
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

// Configuration
data class UXCamConfig(
    val sdkKey: String,
    val apiUrl: String = "https://architecture-hormone-specify-bureau.trycloudflare.com",
    val enableEventTracking: Boolean = true
)

// Main SDK Class (Singleton Pattern - Required for Flutter)
class UXCamSDK private constructor() {
    companion object {
        @Volatile
        private var INSTANCE: UXCamSDK? = null
        
        // Flutter plugin needs getInstance() method
        fun getInstance(): UXCamSDK {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: UXCamSDK().also { INSTANCE = it }
            }
        }
    }
    
    private var config: UXCamConfig? = null
    private var sessionId: String? = null
    private var context: Context? = null
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()
    
    // Initialize (Flutter plugin calls this)
    fun initialize(context: Context, config: UXCamConfig) {
        this.context = context.applicationContext
        this.config = config
        this.sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(8)
        
        // Send session start event
        trackEvent("session_start", mapOf(
            "session_id" to sessionId!!,
            "sdk_version" to "1.0.0"
        ))
    }
    
    // Get session ID (Flutter plugin needs this)
    fun getSessionId(): String? {
        return sessionId
    }
    
    // Track event (Your original code, adapted)
    fun trackEvent(eventType: String, properties: Map<String, Any> = emptyMap()) {
        val config = config ?: return
        val sessionId = sessionId ?: return
        
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        
        val event = JSONObject().apply {
            put("type", eventType)
            put("timestamp", formatter.format(Date()))
            put("data", JSONObject(properties as Map<*, *>))
        }
        
        val payload = JSONObject().apply {
            put("sdk_key", config.sdkKey)
            put("session_id", sessionId)
            put("events", JSONArray().apply { put(event) })
        }
        
        val request = Request.Builder()
            .url("${config.apiUrl}/api/events/ingest")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                // Silent fail - don't break app
            }
            override fun onResponse(call: Call, response: Response) {
                response.close()
            }
        })
    }
    
    // Track page view (Flutter plugin needs this)
    fun trackPageView(page: String, properties: Map<String, Any> = emptyMap()) {
        val props = properties.toMutableMap()
        props["page"] = page
        trackEvent("page_view", props)
    }
    
    // Set user properties (Flutter plugin needs this)
    fun setUserProperties(userId: String?, properties: Map<String, Any>) {
        trackEvent("user_properties_updated", mapOf(
            "user_id" to (userId ?: ""),
            "properties" to properties
        ))
    }
    
    // End session (Flutter plugin needs this)
    fun endSession() {
        trackEvent("session_end", mapOf(
            "timestamp" to System.currentTimeMillis()
        ))
        sessionId = null
    }
    
    // Restart session (Flutter plugin needs this)
    fun restartSession() {
        endSession()
        sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(8)
        trackEvent("session_start", mapOf(
            "session_id" to sessionId!!,
            "sdk_version" to "1.0.0"
        ))
    }
    
    // Stop video recording (Flutter plugin needs this - stub for now)
    fun stopVideoRecording() {
        // Placeholder - video recording not implemented in simple version
    }
}

// Usage in Flutter (via plugin):
// UXCam.instance.initialize(
//   sdkKey: 'ux_41cf74768b872e0f2e8f25acd04a89fc',
//   apiUrl: 'https://architecture-hormone-specify-bureau.trycloudflare.com'
// )
// UXCam.instance.trackEvent('button_click', properties: {'button_id': 'signup'})
