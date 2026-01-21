// Simple UXCam SDK for Android - COMPLETE FIXED VERSION
// 1. Add to build.gradle: implementation 'com.squareup.okhttp3:okhttp:4.12.0'
// 2. Add permission: <uses-permission android:name="android.permission.INTERNET" />

import android.app.Application
import android.os.Build
import okhttp3.*
import org.json.JSONObject
import java.util.*

class UXCamSDK {
    companion object {
        private var sdkKey: String? = null
        private const val API_URL = "https://api.enalyze.123fixit.com"
        private var sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(8)
        private val client = OkHttpClient()
        
        // Initialize with your SDK key (get it from dashboard)
        fun initialize(context: Application, sdkKey: String) {
            this.sdkKey = sdkKey
            // SDK ready!
        }
        
        // Get device info (for backend API)
        private fun getDeviceInfo(context: Application): Map<String, Any> {
            val displayMetrics = context.resources.displayMetrics
            return mapOf(
                "platform" to "android",
                "viewportWidth" to displayMetrics.widthPixels,
                "viewportHeight" to displayMetrics.heightPixels,
                "userAgent" to "Android/${Build.VERSION.RELEASE}",
                "deviceModel" to Build.MODEL,
                "systemVersion" to Build.VERSION.RELEASE,
                "manufacturer" to Build.MANUFACTURER,
                "brand" to Build.BRAND,
                "device" to Build.DEVICE,
                "product" to Build.PRODUCT
            )
        }
        
        fun trackEvent(context: Application, eventType: String, properties: Map<String, Any> = emptyMap()) {
            val key = sdkKey ?: return  // Need to initialize first!
            
            val formatter = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            formatter.timeZone = TimeZone.getTimeZone("UTC")
            
            val event = JSONObject().apply {
                put("type", eventType)
                put("timestamp", formatter.format(Date()))
                put("data", JSONObject(properties as Map<*, *>))
            }
            
            // ✅ FIXED: Include device_info in payload
            val deviceInfo = getDeviceInfo(context)
            
            val payload = JSONObject().apply {
                put("sdk_key", key)
                put("session_id", sessionId)
                put("events", org.json.JSONArray().apply { put(event) })
                put("device_info", JSONObject(deviceInfo as Map<*, *>))  // ✅ Added device_info
            }
            
            val request = Request.Builder()
                .url("${API_URL}/api/events/ingest")
                .post(payload.toString().toRequestBody("application/json".toMediaType()))
                .build()
            
            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: java.io.IOException) {
                    // Silently fail - don't break the app
                }
                override fun onResponse(call: Call, response: Response) { 
                    response.close() 
                }
            })
        }
    }
}

// Usage:
// UXCamSDK.initialize(this, "ux_b56f732d3ae936ebd6e8773f706c54fd")
// UXCamSDK.trackEvent(this, "button_click", mapOf("button_id" to "signup"))
