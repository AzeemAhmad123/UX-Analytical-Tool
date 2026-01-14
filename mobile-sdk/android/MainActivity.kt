//
//  MainActivity.kt
//  Example Usage of UXCam SDK for Android
//

package com.uxcam.example

import android.Manifest
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.uxcam.sdk.UXCamConfig
import com.uxcam.sdk.UXCamSDK

class MainActivity : AppCompatActivity() {
    
    private val REQUEST_CODE_SCREEN_CAPTURE = 1001
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Initialize UXCam SDK
        // For local testing, use your computer's IP address
        // Example: http://192.168.1.100:3001
        val config = UXCamConfig(
            sdkKey = "ux_your_sdk_key_here", // Get from dashboard
            apiUrl = "http://192.168.1.100:3001", // Your local IP
            enableVideoRecording = true,
            enableEventTracking = true
        )
        
        UXCamSDK.getInstance().initialize(this, config)
        
        // Track page view
        UXCamSDK.getInstance().trackPageView("home")
        
        // Setup buttons
        findViewById<Button>(R.id.btnSignup).setOnClickListener {
            trackSignupClick()
        }
        
        findViewById<Button>(R.id.btnStartRecording).setOnClickListener {
            startVideoRecording()
        }
        
        findViewById<Button>(R.id.btnStopRecording).setOnClickListener {
            stopVideoRecording()
        }
        
        findViewById<Button>(R.id.btnSubmitForm).setOnClickListener {
            submitForm()
        }
    }
    
    private fun trackSignupClick() {
        // Track button click
        UXCamSDK.getInstance().trackButtonClick(
            "signup",
            mapOf(
                "button_text" to "Sign Up",
                "screen" to "home"
            )
        )
        
        // Your signup logic here
    }
    
    private fun startVideoRecording() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Request screen capture permission
            val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val captureIntent = projectionManager.createScreenCaptureIntent()
            startActivityForResult(captureIntent, REQUEST_CODE_SCREEN_CAPTURE)
        } else {
            Toast.makeText(this, "Screen recording requires Android 6.0+", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE && resultCode == RESULT_OK && data != null) {
            UXCamSDK.getInstance().startVideoRecording(this, resultCode, data)
            Toast.makeText(this, "Recording started", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun stopVideoRecording() {
        UXCamSDK.getInstance().stopVideoRecording { success ->
            runOnUiThread {
                if (success) {
                    Toast.makeText(this, "Video uploaded successfully", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Video upload failed", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun submitForm() {
        // Track form submission
        UXCamSDK.getInstance().trackFormSubmit(
            "contact",
            mapOf(
                "form_type" to "contact",
                "fields_count" to 5
            )
        )
    }
    
    // Track custom events
    private fun trackCustomEvent() {
        UXCamSDK.getInstance().trackEvent("custom_action", mapOf(
            "action_type" to "purchase",
            "amount" to 99.99,
            "currency" to "USD"
        ))
    }
    
    // Example: Complete Funnel Tracking
    private fun trackFunnelSteps() {
        // Step 1: Page View
        UXCamSDK.getInstance().trackPageView("home")
        
        // Step 2: Button Click
        UXCamSDK.getInstance().trackButtonClick("signup")
        
        // Step 3: Form Submit
        UXCamSDK.getInstance().trackFormSubmit("signup_form")
        
        // Step 4: Custom Event
        UXCamSDK.getInstance().trackEvent("signup_completed", mapOf(
            "plan" to "premium",
            "source" to "mobile_app"
        ))
    }
    
    override fun onDestroy() {
        super.onDestroy()
        UXCamSDK.getInstance().flush()
    }
}

