//
//  UXCamSDK.kt
//  UXCam Analytics SDK for Android
//
//  Created for UXCam Analytics Platform
//  Supports local testing with http://YOUR_IP:3001
//

package com.uxcam.sdk

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.util.Log
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

// MARK: - Configuration
data class UXCamConfig(
    val sdkKey: String,
    val apiUrl: String = "https://your-backend-url.com",
    val enableVideoRecording: Boolean = true,
    val enableEventTracking: Boolean = true
)

// MARK: - Event Model
data class UXCamEvent(
    val type: String,
    val timestamp: Date,
    val data: Map<String, Any>
) {
    fun toJSONObject(): JSONObject {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        
        val json = JSONObject()
        json.put("type", type)
        json.put("timestamp", formatter.format(timestamp))
        
        val dataJson = JSONObject()
        data.forEach { (key, value) ->
            dataJson.put(key, value)
        }
        json.put("data", dataJson)
        
        return json
    }
}

// MARK: - Device Info
object DeviceInfo {
    fun get(context: Context): Map<String, Any> {
        val displayMetrics = context.resources.displayMetrics
        return mapOf(
            "viewportWidth" to displayMetrics.widthPixels,
            "viewportHeight" to displayMetrics.heightPixels,
            "userAgent" to "Android/${Build.VERSION.RELEASE}",
            "platform" to "android",
            "deviceModel" to Build.MODEL,
            "systemVersion" to Build.VERSION.RELEASE
        )
    }
}

// MARK: - UXCam SDK Main Class
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
    private var isRecording = false
    private var mediaRecorder: MediaRecorder? = null
    private var mediaProjection: MediaProjection? = null
    private var videoOutputFile: File? = null
    private var recordingStartTime: Long = 0
    private var virtualDisplay: android.hardware.display.VirtualDisplay? = null
    
    private val eventScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val pendingEvents = mutableListOf<UXCamEvent>()
    private val batchSize = 10
    private var batchJob: Job? = null
    
    // Automatic tracking components
    private var activityLifecycleCallbacks: Application.ActivityLifecycleCallbacks? = null
    private var originalUncaughtExceptionHandler: Thread.UncaughtExceptionHandler? = null
    private var networkInterceptor: UXCamNetworkInterceptor? = null
    private var currentActivity: Activity? = null
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()
    
    // MARK: - Initialization
    fun initialize(context: Context, config: UXCamConfig) {
        this.config = config
        this.context = context.applicationContext
        this.sessionId = generateSessionId()
        
        // Get Application instance for lifecycle callbacks
        if (context is Application) {
            this.application = context as Application
        } else if (context is Activity) {
            this.application = (context as Activity).application
        }
        
        Log.d(TAG, "🎬 UXCam SDK initialized")
        Log.d(TAG, "   SDK Key: ${config.sdkKey.take(10)}...")
        Log.d(TAG, "   API URL: ${config.apiUrl}")
        Log.d(TAG, "   Session ID: $sessionId")
        
        // Start session
        startSession()
        
        // Start batch timer
        startBatchTimer()
        
        // Setup automatic tracking
        setupAutomaticTracking()
    }
    
    // MARK: - Automatic Tracking Setup
    private fun setupAutomaticTracking() {
        val config = config ?: return
        
        if (!config.enableEventTracking) return
        
        // 1. Automatic Screen Transition Tracking
        setupScreenTracking()
        
        // 2. Automatic Network Call Interception
        setupNetworkTracking()
        
        // 3. Automatic Crash Detection
        setupCrashTracking()
    }
    
    // MARK: - Automatic Screen Transition Tracking
    private fun setupScreenTracking() {
        val app = application ?: return
        
        activityLifecycleCallbacks = object : Application.ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
                currentActivity = activity
            }
            
            override fun onActivityStarted(activity: Activity) {
                currentActivity = activity
            }
            
            override fun onActivityResumed(activity: Activity) {
                currentActivity = activity
                // Auto-track screen view when activity resumes
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
            
            override fun onActivityStopped(activity: Activity) {
                if (currentActivity == activity) {
                    currentActivity = null
                }
            }
            
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            
            override fun onActivityDestroyed(activity: Activity) {
                if (currentActivity == activity) {
                    currentActivity = null
                }
            }
        }
        
        app.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)
        Log.d(TAG, "✅ Automatic screen tracking enabled")
    }
    
    // MARK: - Automatic Network Call Interception
    private fun setupNetworkTracking() {
        networkInterceptor = UXCamNetworkInterceptor(this)
        Log.d(TAG, "✅ Network interceptor created (add to OkHttpClient in your app)")
    }
    
    /**
     * Get the network interceptor to add to your OkHttpClient
     * Usage:
     * val client = OkHttpClient.Builder()
     *     .addInterceptor(UXCamSDK.getInstance().getNetworkInterceptor())
     *     .build()
     */
    fun getNetworkInterceptor(): Interceptor? {
        return networkInterceptor
    }
    
    // MARK: - Automatic Crash Detection
    private fun setupCrashTracking() {
        originalUncaughtExceptionHandler = Thread.getDefaultUncaughtExceptionHandler()
        
        Thread.setDefaultUncaughtExceptionHandler { thread, exception ->
            // Track crash event
            trackEvent("crash", mapOf(
                "error" to (exception.message ?: "Unknown error"),
                "stack_trace" to exception.stackTraceToString(),
                "thread" to thread.name,
                "thread_id" to thread.id,
                "auto_tracked" to true
            ))
            
            // Flush events immediately before crash
            flushEvents()
            
            Log.e(TAG, "💥 Crash detected and tracked", exception)
            
            // Call original handler
            originalUncaughtExceptionHandler?.uncaughtException(thread, exception)
        }
        
        Log.d(TAG, "✅ Automatic crash detection enabled")
    }
    
    // MARK: - Session Management
    private fun generateSessionId(): String {
        val timestamp = System.currentTimeMillis()
        val random = UUID.randomUUID().toString().take(8)
        return "sess_${timestamp}_$random"
    }
    
    fun getSessionId(): String? {
        return sessionId
    }
    
    private fun startSession() {
        val config = config ?: return
        val sessionId = sessionId ?: return
        
        // Send session start event
        trackEvent("session_start", mapOf(
            "session_id" to sessionId,
            "sdk_version" to "1.0.0"
        ))
    }
    
    fun endSession() {
        sessionId = null
        isRecording = false
        stopVideoRecording()
        trackEvent("session_end", mapOf(
            "timestamp" to System.currentTimeMillis()
        ))
    }
    
    fun restartSession() {
        endSession()
        sessionId = generateSessionId()
        startSession()
    }
    
    fun setUserProperties(userId: String?, properties: Map<String, Any>) {
        // Store user properties for future events
        // This would be sent with each event batch
        trackEvent("user_properties_updated", mapOf(
            "user_id" to (userId ?: ""),
            "properties" to properties
        ))
    }
    
    // MARK: - Event Tracking
    fun trackEvent(type: String, properties: Map<String, Any> = emptyMap()) {
        val config = config ?: return
        if (!config.enableEventTracking) return
        
        val event = UXCamEvent(
            type = type,
            timestamp = Date(),
            data = properties
        )
        
        eventScope.launch {
            synchronized(pendingEvents) {
                pendingEvents.add(event)
                flushEventsIfNeeded()
            }
        }
    }
    
    // Convenience methods
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
    
    // MARK: - Event Batching & Flushing
    private fun startBatchTimer() {
        batchJob = eventScope.launch {
            while (isActive) {
                delay(5000) // 5 seconds
                flushEvents()
            }
        }
    }
    
    private fun flushEventsIfNeeded() {
        synchronized(pendingEvents) {
            if (pendingEvents.size >= batchSize) {
                flushEvents()
            }
        }
    }
    
    private fun flushEvents() {
        val eventsToSend: List<UXCamEvent>
        
        synchronized(pendingEvents) {
            if (pendingEvents.isEmpty()) return
            eventsToSend = pendingEvents.toList()
            pendingEvents.clear()
        }
        
        sendEvents(eventsToSend)
    }
    
    private fun sendEvents(events: List<UXCamEvent>) {
        val config = config ?: return
        val sessionId = sessionId ?: return
        
        val eventArray = JSONArray()
        events.forEach { event ->
            eventArray.put(event.toJSONObject())
        }
        
        val deviceInfo = JSONObject()
        val ctx = context
        if (ctx != null) {
            DeviceInfo.get(ctx).forEach { (key, value) ->
                deviceInfo.put(key, value)
            }
        } else {
            deviceInfo.put("platform", "android")
            deviceInfo.put("systemVersion", Build.VERSION.RELEASE)
        }
        
        val payload = JSONObject().apply {
            put("sdk_key", config.sdkKey)
            put("session_id", sessionId)
            put("events", eventArray)
            put("device_info", deviceInfo)
        }
        
        val url = "${config.apiUrl}/api/events/ingest"
        val requestBody = payload.toString().toRequestBody("application/json".toMediaType())
        
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "❌ Error sending events: ${e.message}")
                // Re-add events to queue on failure
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
                    // Re-add events to queue on failure
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
    
    // MARK: - Video Recording
    fun startVideoRecording(context: Context, resultCode: Int, data: Intent) {
        val sdkConfig = this.config ?: run {
            Log.w(TAG, "⚠️ SDK not initialized")
            return
        }
        
        if (!sdkConfig.enableVideoRecording) {
            Log.w(TAG, "⚠️ Video recording is disabled")
            return
        }
        
        if (isRecording) {
            Log.w(TAG, "⚠️ Recording already in progress")
            return
        }
        
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            Log.e(TAG, "❌ Screen recording requires Android 5.0+")
            return
        }
        
        val projectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, data)
        
        // Create temporary file for recording
        val videoDir = File(context.cacheDir, "uxcam_recordings")
        if (!videoDir.exists()) {
            videoDir.mkdirs()
        }
        
        videoOutputFile = File(videoDir, "uxcam_recording_${UUID.randomUUID()}.mp4")
        
        try {
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            
            mediaRecorder?.apply {
                setVideoSource(MediaRecorder.VideoSource.SURFACE)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setOutputFile(videoOutputFile!!.absolutePath)
                setVideoEncoder(MediaRecorder.VideoEncoder.H264)
                setVideoSize(1920, 1080)
                setVideoEncodingBitRate(8 * 1000 * 1000) // 8 Mbps
                setVideoFrameRate(30)
                
                prepare()
                
                val surface = surface
                virtualDisplay = mediaProjection?.createVirtualDisplay(
                    "UXCamRecording",
                    1920, 1080,
                    320,
                    0,
                    surface,
                    null,
                    null
                )
                
                start()
                
                recordingStartTime = System.currentTimeMillis()
                isRecording = true
                
                Log.d(TAG, "🎥 Started video recording")
                trackEvent("video_recording_started", emptyMap())
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start recording: ${e.message}")
            isRecording = false
            recordingStartTime = 0
        }
    }
    
    fun stopVideoRecording(completion: ((Boolean) -> Unit)? = null) {
        if (!isRecording) {
            Log.w(TAG, "⚠️ No recording in progress")
            completion?.invoke(false)
            return
        }
        
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            
            virtualDisplay?.release()
            virtualDisplay = null
            
            mediaProjection?.stop()
            mediaProjection = null
            
            isRecording = false
            
            val duration = System.currentTimeMillis() - recordingStartTime
            
            Log.d(TAG, "🎥 Stopped video recording (duration: ${duration}ms)")
            trackEvent("video_recording_stopped", mapOf(
                "duration" to duration
            ))
            
            val videoFile = videoOutputFile
            if (videoFile != null && videoFile.exists()) {
                uploadVideo(videoFile, duration.toDouble(), completion)
            } else {
                Log.e(TAG, "❌ Video file not found")
                completion?.invoke(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to stop recording: ${e.message}")
            completion?.invoke(false)
        }
    }
    
    // MARK: - Video Upload
    private fun uploadVideo(videoFile: File, duration: Double, completion: ((Boolean) -> Unit)?) {
        val sdkConfig = this.config ?: run {
            completion?.invoke(false)
            return
        }
        val sessionId = this.sessionId ?: run {
            completion?.invoke(false)
            return
        }
        
        val fileSize = videoFile.length()
        Log.d(TAG, "📤 Uploading video ($fileSize bytes)...")
        
        val url = "${sdkConfig.apiUrl}/api/videos/upload"
        
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("sdk_key", sdkConfig.sdkKey)
            .addFormDataPart("session_id", sessionId)
            .addFormDataPart("duration", duration.toInt().toString())
            .addFormDataPart(
                "video",
                "recording.mp4",
                videoFile.asRequestBody("video/mp4".toMediaType())
            )
            .build()
        
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                Log.e(TAG, "❌ Error uploading video: ${e.message}")
                completion?.invoke(false)
            }
            
            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    Log.d(TAG, "✅ Video uploaded successfully")
                    // Clean up local file
                    videoFile.delete()
                    completion?.invoke(true)
                } else {
                    Log.w(TAG, "⚠️ Server returned status: ${response.code}")
                    response.body?.string()?.let { Log.d(TAG, "   Response: $it") }
                    completion?.invoke(false)
                }
                response.close()
            }
        })
    }
    
    // MARK: - Cleanup
    fun flush() {
        flushEvents()
    }
    
    fun cleanup() {
        batchJob?.cancel()
        if (isRecording) {
            stopVideoRecording()
        }
        flushEvents()
        
        // Unregister automatic tracking
        application?.let { app ->
            activityLifecycleCallbacks?.let { app.unregisterActivityLifecycleCallbacks(it) }
        }
        activityLifecycleCallbacks = null
        
        // Restore original crash handler
        originalUncaughtExceptionHandler?.let {
            Thread.setDefaultUncaughtExceptionHandler(it)
        }
        originalUncaughtExceptionHandler = null
        
        networkInterceptor = null
        currentActivity = null
        
        eventScope.cancel()
    }
    
    companion object {
        private const val TAG = "UXCamSDK"
    }
}

// MARK: - Network Interceptor for Automatic Network Tracking
class UXCamNetworkInterceptor(private val sdk: UXCamSDK) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val startTime = System.currentTimeMillis()
        
        // Track request
        sdk.trackEvent("network_request", mapOf(
            "url" to request.url.toString(),
            "method" to request.method,
            "host" to request.url.host,
            "path" to request.url.encodedPath,
            "timestamp" to startTime,
            "auto_tracked" to true
        ))
        
        var response: Response? = null
        var error: Throwable? = null
        
        try {
            response = chain.proceed(request)
            val duration = System.currentTimeMillis() - startTime
            
            // Track successful response
            sdk.trackEvent("network_response", mapOf(
                "url" to request.url.toString(),
                "method" to request.method,
                "status_code" to response.code,
                "status_text" to response.message,
                "duration" to duration,
                "response_size" to (response.body?.contentLength() ?: 0),
                "success" to response.isSuccessful,
                "auto_tracked" to true
            ))
            
            return response
        } catch (e: Exception) {
            error = e
            val duration = System.currentTimeMillis() - startTime
            
            // Track network error
            sdk.trackEvent("network_error", mapOf(
                "url" to request.url.toString(),
                "method" to request.method,
                "error" to (e.message ?: "Unknown error"),
                "error_type" to e.javaClass.simpleName,
                "duration" to duration,
                "auto_tracked" to true
            ))
            
            throw e
        }
    }
}

