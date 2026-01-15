//
//  UXCamSDK_Complete.kt
//  Complete UXCam SDK for Android - All Features
//  Works with: Native Android, Flutter, React Native
//
//  Setup:
//  1. Add to build.gradle: implementation 'com.squareup.okhttp3:okhttp:4.12.0'
//  2. Add permission: <uses-permission android:name="android.permission.INTERNET" />
//

package com.uxcam.sdk

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import kotlinx.coroutines.*
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
    val enableVideoRecording: Boolean = true,
    val enableEventTracking: Boolean = true,
    val enableAutomaticTracking: Boolean = true
) {
    // Constructor for Flutter compatibility (without enableAutomaticTracking)
    constructor(
        sdkKey: String,
        apiUrl: String,
        enableVideoRecording: Boolean,
        enableEventTracking: Boolean
    ) : this(sdkKey, apiUrl, enableVideoRecording, enableEventTracking, true)
}

// Main SDK Class (Singleton - Required for Flutter/React Native)
class UXCamSDK private constructor() {
    companion object {
        @Volatile
        private var INSTANCE: UXCamSDK? = null
        
        fun getInstance(): UXCamSDK {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: UXCamSDK().also { INSTANCE = it }
            }
        }
    }
    
    private var config: UXCamConfig? = null
    private var sessionId: String? = null
    private var context: Context? = null
    private var application: Application? = null
    
    // Event batching
    private val eventScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val pendingEvents = mutableListOf<JSONObject>()
    private val batchSize = 10
    private var batchJob: Job? = null
    
    // Automatic tracking
    private var activityLifecycleCallbacks: Application.ActivityLifecycleCallbacks? = null
    private var originalUncaughtExceptionHandler: Thread.UncaughtExceptionHandler? = null
    private var networkInterceptor: UXCamNetworkInterceptor? = null
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    fun initialize(context: Context, config: UXCamConfig) {
        this.context = context.applicationContext
        this.config = config
        
        // Get Application instance
        if (context is Application) {
            this.application = context as Application
        } else if (context is Activity) {
            this.application = (context as Activity).application
        }
        
        // Generate session ID
        this.sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(8)
        
        Log.d(TAG, "🎬 UXCam SDK initialized")
        Log.d(TAG, "   SDK Key: ${config.sdkKey.take(10)}...")
        Log.d(TAG, "   API URL: ${config.apiUrl}")
        Log.d(TAG, "   Session ID: $sessionId")
        
        // Start session
        trackEvent("session_start", mapOf(
            "session_id" to sessionId!!,
            "sdk_version" to "1.0.0"
        ))
        
        // Start batch timer
        startBatchTimer()
        
        // Setup automatic tracking
        if (config.enableAutomaticTracking && config.enableEventTracking) {
            setupAutomaticTracking()
        }
    }
    
    // Simple initialize (backward compatible)
    fun initialize(context: Application, sdkKey: String) {
        val config = UXCamConfig(
            sdkKey = sdkKey,
            apiUrl = "https://architecture-hormone-specify-bureau.trycloudflare.com"
        )
        initialize(context, config)
    }
    
    // ============================================
    // AUTOMATIC TRACKING
    // ============================================
    
    private fun setupAutomaticTracking() {
        val config = config ?: return
        if (!config.enableEventTracking) return
        
        setupScreenTracking()
        setupNetworkTracking()
        setupCrashTracking()
        
        Log.d(TAG, "✅ Automatic tracking enabled")
    }
    
    private fun setupScreenTracking() {
        val app = application ?: return
        
        activityLifecycleCallbacks = object : Application.ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                val screenName = activity.javaClass.simpleName
                trackPageView(screenName, mapOf(
                    "activity" to screenName,
                    "title" to (activity.title?.toString() ?: ""),
                    "auto_tracked" to true
                ))
                Log.d(TAG, "📱 Auto-tracked screen: $screenName")
            }
            
            override fun onActivityPaused(activity: Activity) {
                trackEvent("screen_paused", mapOf(
                    "activity" to activity.javaClass.simpleName,
                    "auto_tracked" to true
                ))
            }
            
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        }
        
        app.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)
    }
    
    private fun setupNetworkTracking() {
        networkInterceptor = UXCamNetworkInterceptor(this)
        Log.d(TAG, "✅ Network interceptor created")
    }
    
    fun getNetworkInterceptor(): Interceptor? {
        return networkInterceptor
    }
    
    private fun setupCrashTracking() {
        originalUncaughtExceptionHandler = Thread.getDefaultUncaughtExceptionHandler()
        
        Thread.setDefaultUncaughtExceptionHandler { thread, exception ->
            trackEvent("crash", mapOf(
                "error" to (exception.message ?: "Unknown error"),
                "stack_trace" to exception.stackTraceToString(),
                "thread" to thread.name,
                "auto_tracked" to true
            ))
            flushEvents()
            Log.e(TAG, "💥 Crash detected and tracked", exception)
            originalUncaughtExceptionHandler?.uncaughtException(thread, exception)
        }
    }
    
    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    fun getSessionId(): String? {
        return sessionId
    }
    
    fun endSession() {
        trackEvent("session_end", mapOf(
            "timestamp" to System.currentTimeMillis()
        ))
        flushEvents()
        sessionId = null
    }
    
    fun restartSession() {
        endSession()
        sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(8)
        trackEvent("session_start", mapOf(
            "session_id" to sessionId!!,
            "sdk_version" to "1.0.0"
        ))
    }
    
    // ============================================
    // EVENT TRACKING
    // ============================================
    
    fun trackEvent(eventType: String, properties: Map<String, Any> = emptyMap()) {
        val config = config ?: return
        if (!config.enableEventTracking) return
        
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        
        val event = JSONObject().apply {
            put("type", eventType)
            put("timestamp", formatter.format(Date()))
            put("data", JSONObject(properties as Map<*, *>))
        }
        
        eventScope.launch {
            synchronized(pendingEvents) {
                pendingEvents.add(event)
                if (pendingEvents.size >= batchSize) {
                    flushEvents()
                }
            }
        }
    }
    
    fun trackPageView(page: String, properties: Map<String, Any> = emptyMap()) {
        val props = properties.toMutableMap()
        props["page"] = page
        trackEvent("page_view", props)
    }
    
    fun trackButtonClick(buttonId: String, properties: Map<String, Any> = emptyMap()) {
        val props = properties.toMutableMap()
        props["button_id"] = buttonId
        trackEvent("button_click", props)
    }
    
    fun trackFormSubmit(formId: String, properties: Map<String, Any> = emptyMap()) {
        val props = properties.toMutableMap()
        props["form_id"] = formId
        trackEvent("form_submit", props)
    }
    
    fun setUserProperties(userId: String?, properties: Map<String, Any>) {
        trackEvent("user_properties_updated", mapOf(
            "user_id" to (userId ?: ""),
            "properties" to properties
        ))
    }
    
    // ============================================
    // EVENT BATCHING & FLUSHING
    // ============================================
    
    private fun startBatchTimer() {
        batchJob = eventScope.launch {
            while (isActive) {
                delay(5000) // 5 seconds
                flushEvents()
            }
        }
    }
    
    fun flushEvents() {
        val eventsToSend: List<JSONObject>
        val config = config ?: return
        val sessionId = sessionId ?: return
        
        synchronized(pendingEvents) {
            if (pendingEvents.isEmpty()) return
            eventsToSend = pendingEvents.toList()
            pendingEvents.clear()
        }
        
        sendEvents(eventsToSend)
    }
    
    private fun sendEvents(events: List<JSONObject>) {
        val config = config ?: return
        val sessionId = sessionId ?: return
        
        val deviceInfo = getDeviceInfo()
        
        val payload = JSONObject().apply {
            put("sdk_key", config.sdkKey)
            put("session_id", sessionId)
            put("events", JSONArray(events))
            put("device_info", JSONObject(deviceInfo as Map<*, *>))
        }
        
        val request = Request.Builder()
            .url("${config.apiUrl}/api/events/ingest")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "❌ Error sending events: ${e.message}")
                // Re-add events on failure
                eventScope.launch {
                    synchronized(pendingEvents) {
                        pendingEvents.addAll(0, events)
                    }
                }
            }
            
            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    Log.d(TAG, "✅ Sent ${events.size} events successfully")
                } else {
                    Log.w(TAG, "⚠️ Server returned status: ${response.code}")
                    eventScope.launch {
                        synchronized(pendingEvents) {
                            pendingEvents.addAll(0, events)
                        }
                    }
                }
                response.close()
            }
        })
    }
    
    // ============================================
    // DEVICE INFO
    // ============================================
    
    private fun getDeviceInfo(): Map<String, Any> {
        val ctx = context ?: return emptyMap()
        val displayMetrics = ctx.resources.displayMetrics
        return mapOf(
            "viewportWidth" to displayMetrics.widthPixels,
            "viewportHeight" to displayMetrics.heightPixels,
            "userAgent" to "Android/${Build.VERSION.RELEASE}",
            "platform" to "android",
            "deviceModel" to Build.MODEL,
            "systemVersion" to Build.VERSION.RELEASE,
            "manufacturer" to Build.MANUFACTURER,
            "brand" to Build.BRAND
        )
    }
    
    // ============================================
    // CLEANUP
    // ============================================
    
    fun cleanup() {
        batchJob?.cancel()
        flushEvents()
        
        application?.let { app ->
            activityLifecycleCallbacks?.let { app.unregisterActivityLifecycleCallbacks(it) }
        }
        
        originalUncaughtExceptionHandler?.let {
            Thread.setDefaultUncaughtExceptionHandler(it)
        }
        
        eventScope.cancel()
    }
    
    // Video recording stubs (for Flutter compatibility)
    fun startVideoRecording(context: Context, resultCode: Int, data: Intent) {
        // Placeholder - video recording not implemented in simple version
    }
    
    fun stopVideoRecording() {
        // Placeholder - video recording not implemented in simple version
    }
    
    fun stopVideoRecording(completion: ((Boolean) -> Unit)?) {
        completion?.invoke(false)
    }
    
    companion object {
        private const val TAG = "UXCamSDK"
    }
}

// Network Interceptor for Automatic Network Tracking
class UXCamNetworkInterceptor(private val sdk: UXCamSDK) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val startTime = System.currentTimeMillis()
        
        sdk.trackEvent("network_request", mapOf(
            "url" to request.url.toString(),
            "method" to request.method,
            "host" to request.url.host,
            "auto_tracked" to true
        ))
        
        try {
            val response = chain.proceed(request)
            val duration = System.currentTimeMillis() - startTime
            
            sdk.trackEvent("network_response", mapOf(
                "url" to request.url.toString(),
                "method" to request.method,
                "status_code" to response.code,
                "duration" to duration,
                "success" to response.isSuccessful,
                "auto_tracked" to true
            ))
            
            return response
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            sdk.trackEvent("network_error", mapOf(
                "url" to request.url.toString(),
                "method" to request.method,
                "error" to (e.message ?: "Unknown error"),
                "duration" to duration,
                "auto_tracked" to true
            ))
            throw e
        }
    }
}
