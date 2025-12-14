# ANPR Integration Guide for Web App & Android App

This guide will help you integrate the ANPR system into your **existing deployed web app and Android app**.

## Current Setup Status

✅ **Backend API** - Already created and ready  
✅ **Web App Frontend** - Already integrated  
✅ **Android App** - Needs integration code  

## Step 1: Ensure Backend is Configured

### 1.1 Install Backend Dependencies

```bash
cd server
npm install axios
```

### 1.2 Add Environment Variable

Add to your backend `.env` file (or hosting platform environment variables):

```env
ANPR_SERVICE_URL=http://localhost:5000
```

**For Production:** Update this to your Python service URL:
```env
ANPR_SERVICE_URL=https://your-python-service.com
```

### 1.3 Verify CORS is Configured

The backend should already allow requests from your web and mobile apps. Check `server/src/app.js` - it should allow your frontend origins.

## Step 2: Start Python ANPR Service

### 2.1 Install Python Dependencies

```bash
cd anpr-service
pip3 install -r requirements.txt
```

### 2.2 Start the Service

**For Development:**
```bash
python3 anpr.py
```

**For Production:**
- Deploy to a server (same as backend or separate)
- Use process manager (PM2, systemd, Docker)
- Ensure it's accessible via HTTP/HTTPS

## Step 3: Web App Integration (Already Done!)

Your web app already has:
- ✅ ANPR page component (`src/pages/ANPR.jsx`)
- ✅ API client functions (`src/api/index.js`)
- ✅ Navigation menu item
- ✅ Route configured

**Just ensure:**
1. Backend is running with ANPR routes
2. Python service is running
3. Environment variable is set

## Step 4: Android App Integration

### 4.1 Add Dependencies

Add to your `app/build.gradle` (or `build.gradle.kts`):

```gradle
dependencies {
    // HTTP client (if not already using)
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
    
    // JSON parsing (if not already using)
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Camera (if not already using)
    implementation 'androidx.camera:camera-core:1.3.0'
    implementation 'androidx.camera:camera-camera2:1.3.0'
    implementation 'androidx.camera:camera-lifecycle:1.3.0'
    implementation 'androidx.camera:camera-view:1.3.0'
}
```

### 4.2 Add Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### 4.3 Create ANPR API Client

Create `AnprApiClient.kt` (or `.java`):

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class AnprApiClient(private val baseUrl: String, private val authToken: String) {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val JSON = "application/json; charset=utf-8".toMediaType()
    
    /**
     * Process an image through ANPR
     * @param imageBase64 Base64 encoded image (without data URL prefix)
     * @return ANPR result with detections and vehicle matches
     */
    fun processImage(imageBase64: String): AnprResult {
        val url = "$baseUrl/api/anpr/process"
        
        val json = JSONObject()
        json.put("image", "data:image/jpeg;base64,$imageBase64")
        
        val requestBody = json.toString().toRequestBody(JSON)
        
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .addHeader("Authorization", "Bearer $authToken")
            .addHeader("Content-Type", "application/json")
            .build()
        
        return try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw IOException("Empty response")
            
            if (response.isSuccessful) {
                parseAnprResponse(responseBody)
            } else {
                throw IOException("ANPR request failed: ${response.code} - $responseBody")
            }
        } catch (e: Exception) {
            throw IOException("ANPR request error: ${e.message}", e)
        }
    }
    
    /**
     * Check ANPR service health
     */
    fun checkHealth(): Boolean {
        val url = "$baseUrl/api/anpr/health"
        
        val request = Request.Builder()
            .url(url)
            .get()
            .build()
        
        return try {
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
    
    private fun parseAnprResponse(json: String): AnprResult {
        val jsonObject = JSONObject(json)
        val detections = mutableListOf<Detection>()
        val vehicles = mutableListOf<Vehicle>()
        
        if (jsonObject.has("detections")) {
            val detectionsArray = jsonObject.getJSONArray("detections")
            for (i in 0 until detectionsArray.length()) {
                val det = detectionsArray.getJSONObject(i)
                detections.add(parseDetection(det))
            }
        }
        
        if (jsonObject.has("vehicles")) {
            val vehiclesArray = jsonObject.getJSONArray("vehicles")
            for (i in 0 until vehiclesArray.length()) {
                val veh = vehiclesArray.getJSONObject(i)
                vehicles.add(parseVehicle(veh))
            }
        }
        
        val summary = if (jsonObject.has("summary")) {
            val sum = jsonObject.getJSONObject("summary")
            Summary(
                totalDetected = sum.optInt("totalDetected", 0),
                matched = sum.optInt("matched", 0),
                unmatched = sum.optInt("unmatched", 0)
            )
        } else {
            Summary(0, 0, 0)
        }
        
        return AnprResult(
            success = jsonObject.optBoolean("success", false),
            detections = detections,
            vehicles = vehicles,
            summary = summary
        )
    }
    
    private fun parseDetection(json: JSONObject): Detection {
        return Detection(
            registration = json.getString("registration"),
            confidence = json.getDouble("confidence").toFloat(),
            matched = json.optBoolean("matched", false),
            vehicle = if (json.has("vehicle") && !json.isNull("vehicle")) {
                parseVehicle(json.getJSONObject("vehicle"))
            } else null,
            bbox = if (json.has("bbox")) {
                val bboxArray = json.getJSONArray("bbox")
                BoundingBox(
                    x1 = bboxArray.getInt(0),
                    y1 = bboxArray.getInt(1),
                    x2 = bboxArray.getInt(2),
                    y2 = bboxArray.getInt(3)
                )
            } else null
        )
    }
    
    private fun parseVehicle(json: JSONObject): Vehicle {
        return Vehicle(
            id = json.getString("id"),
            registrationPlate = json.getString("registration_plate"),
            permitNumber = json.optString("permit_number", null),
            parkingType = json.getString("parking_type"),
            notes = json.optString("notes", null),
            isActive = json.optBoolean("is_active", true)
        )
    }
}

// Data classes
data class AnprResult(
    val success: Boolean,
    val detections: List<Detection>,
    val vehicles: List<Vehicle>,
    val summary: Summary
)

data class Detection(
    val registration: String,
    val confidence: Float,
    val matched: Boolean,
    val vehicle: Vehicle?,
    val bbox: BoundingBox?
)

data class Vehicle(
    val id: String,
    val registrationPlate: String,
    val permitNumber: String?,
    val parkingType: String,
    val notes: String?,
    val isActive: Boolean
)

data class Summary(
    val totalDetected: Int,
    val matched: Int,
    val unmatched: Int
)

data class BoundingBox(
    val x1: Int,
    val y1: Int,
    val x2: Int,
    val y2: Int
)
```

### 4.4 Create ANPR Activity/Fragment

Create `AnprActivity.kt`:

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Base64
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class AnprActivity : AppCompatActivity() {
    
    private lateinit var cameraExecutor: ExecutorService
    private var imageCapture: ImageCapture? = null
    private lateinit var anprApiClient: AnprApiClient
    
    // Get these from your app's config/auth
    private val apiBaseUrl = "https://your-backend-url.com" // Your deployed backend URL
    private val authToken = "your-auth-token" // Get from your auth system
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_anpr) // Create this layout
        
        anprApiClient = AnprApiClient(apiBaseUrl, authToken)
        cameraExecutor = Executors.newSingleThreadExecutor()
        
        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this,
                REQUIRED_PERMISSIONS,
                REQUEST_CODE_PERMISSIONS
            )
        }
    }
    
    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(
            baseContext, it
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.previewView.surfaceProvider)
            }
            
            imageCapture = ImageCapture.Builder().build()
            
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this as LifecycleOwner,
                    cameraSelector,
                    preview,
                    imageCapture
                )
            } catch(ex: Exception) {
                // Handle error
            }
        }, ContextCompat.getMainExecutor(this))
    }
    
    fun captureAndProcess() {
        val imageCapture = imageCapture ?: return
        
        imageCapture.takePicture(
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    // Convert to Bitmap
                    val bitmap = imageProxyToBitmap(image)
                    
                    // Convert to Base64
                    val base64 = bitmapToBase64(bitmap)
                    
                    // Process on background thread
                    Thread {
                        try {
                            val result = anprApiClient.processImage(base64)
                            
                            // Update UI on main thread
                            runOnUiThread {
                                displayResults(result)
                            }
                        } catch (e: Exception) {
                            runOnUiThread {
                                Toast.makeText(
                                    this@AnprActivity,
                                    "Error: ${e.message}",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    }.start()
                    
                    image.close()
                }
                
                override fun onError(exception: ImageCaptureException) {
                    Toast.makeText(
                        this@AnprActivity,
                        "Capture failed: ${exception.message}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        )
    }
    
    private fun imageProxyToBitmap(image: ImageProxy): Bitmap {
        val buffer = image.planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        return android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }
    
    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
    
    private fun displayResults(result: AnprResult) {
        // Update your UI with results
        // result.detections - list of detected license plates
        // result.vehicles - list of matched vehicles
        // result.summary - summary statistics
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                startCamera()
            } else {
                Toast.makeText(
                    this,
                    "Camera permissions not granted",
                    Toast.LENGTH_SHORT
                ).show()
                finish()
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
    
    companion object {
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }
}
```

### 4.5 Add to Your Existing Android App

1. **Add the API client** to your existing network module
2. **Add ANPR button/menu item** in your main activity
3. **Navigate to ANPR activity** when clicked
4. **Use your existing auth token** for API calls

## Step 5: Test Integration

### 5.1 Test Web App

1. Open your deployed web app
2. Navigate to "ANPR System"
3. Test camera capture
4. Verify results display

### 5.2 Test Android App

1. Build and install on device
2. Open ANPR screen
3. Grant camera permissions
4. Capture image
5. Verify API call succeeds
6. Check results display

## Step 6: Production Deployment

### 6.1 Deploy Python Service

Options:
- **Same server as backend** (if same machine)
- **Separate server** (recommended for scaling)
- **Docker container** (easiest deployment)
- **Cloud service** (AWS, GCP, Azure)

### 6.2 Update Environment Variables

**Backend `.env`:**
```env
ANPR_SERVICE_URL=https://your-python-service.com
```

**Android App Config:**
```kotlin
// Update in your config file
private val apiBaseUrl = "https://your-backend-url.com"
```

### 6.3 Ensure HTTPS

- Both backend and Python service should use HTTPS
- Required for camera access in browsers
- Required for secure API calls

## Troubleshooting

### Web App Issues

**"ANPR service is not available"**
- Check Python service is running
- Verify `ANPR_SERVICE_URL` in backend `.env`
- Check backend logs for connection errors

**"Could not access camera"**
- Ensure HTTPS (required for camera)
- Grant browser permissions
- Check browser console for errors

### Android App Issues

**Network errors**
- Verify backend URL is correct
- Check auth token is valid
- Ensure device has internet
- Check backend CORS settings

**Camera not working**
- Verify permissions granted
- Check `AndroidManifest.xml` permissions
- Test on physical device (emulator may have issues)

**API timeout**
- Increase timeout in `AnprApiClient`
- Check Python service is responsive
- Verify network connectivity

## Quick Checklist

- [ ] Python service installed and running
- [ ] Backend has `axios` installed
- [ ] Backend has `ANPR_SERVICE_URL` in environment
- [ ] Backend routes are accessible
- [ ] Web app shows "ANPR System" in menu
- [ ] Android app has ANPR API client
- [ ] Android app has camera permissions
- [ ] Both apps use correct backend URL
- [ ] Both apps use valid auth tokens
- [ ] Production uses HTTPS

## Next Steps

1. **Test locally first** - Get it working on your machine
2. **Deploy Python service** - Put it on a server
3. **Update backend config** - Point to production Python service
4. **Test web app** - Verify it works in production
5. **Test Android app** - Build and test on device
6. **Monitor performance** - Check response times and errors

Need help with any specific part? Let me know!

