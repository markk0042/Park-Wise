import React, { useState, useEffect, useRef } from 'react';
import { processALPRImage, checkALPRHealth, createParkingLog } from '@/api';
import { fetchVehicles } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, FileText, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// Get best detection from results (highest confidence)
const getBestDetection = (detections) => {
  if (!detections || detections.length === 0) {
    return null;
  }
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  return sorted[0];
};

// Normalize registration by removing dashes
const normalizeRegistration = (reg) => {
  if (!reg) return "";
  return reg.replace(/-/g, "").toUpperCase().trim();
};

export default function ALPR() {
  const [mode, setMode] = useState("preview");
  const [autoCapture, setAutoCapture] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detection, setDetection] = useState(null);
  const [serviceHealth, setServiceHealth] = useState(null);
  const [serviceChecked, setServiceChecked] = useState(false);
  const [liveDetection, setLiveDetection] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showLogging, setShowLogging] = useState(false);
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [loggingSuccess, setLoggingSuccess] = useState(false);
  const [logging, setLogging] = useState(false);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const processingIntervalRef = useRef(null);
  const lastProcessTimeRef = useRef(0);
  
  const { toast, dismiss } = useToast();
  const { profile: user } = useAuth();

  // Fetch vehicles for searching
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => fetchVehicles(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Check ALPR service health on mount
  useEffect(() => {
    checkServiceHealth();
  }, []);

  // Handle video stream attachment
  useEffect(() => {
    if (stream && videoRef.current && mode === "preview") {
      console.log('[ALPR] Attaching stream to video element');
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        // Ignore AbortError - this happens when video is stopped/cleared quickly
        if (err.name !== 'AbortError') {
          console.error('Video play error:', err);
        }
      });
    } else if (!stream && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream, mode]);

  // Handle auto-capture mode
  useEffect(() => {
    if (mode === "preview" && autoCapture && isCameraActive) {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }
    return () => {
      stopAutoCapture();
    };
  }, [mode, autoCapture, isCameraActive]);

  const checkServiceHealth = async () => {
    try {
      console.log('[ALPR] Checking service health...');
      const result = await checkALPRHealth();
      console.log('[ALPR] Health check result:', result);
      const isAvailable = result?.service_available === true;
      console.log('[ALPR] Service available:', isAvailable);
      setServiceHealth(isAvailable);
    } catch (error) {
      console.error('[ALPR] Health check error:', error);
      setServiceHealth(false);
    } finally {
      setServiceChecked(true);
    }
  };

  const startAutoCapture = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }

    console.log("[ALPR] Starting auto-capture scanning...");
    scanForPlate(); // First scan immediately
    processingIntervalRef.current = setInterval(() => {
      scanForPlate();
    }, 2000);
  };

  const stopAutoCapture = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  };

  const scanForPlate = async () => {
    if (!videoRef.current || processing || serviceHealth === false || !autoCapture) {
      console.log("[ALPR] Scan skipped:", { 
        hasCamera: !!videoRef.current, 
        processing, 
        serviceHealth, 
        autoCapture 
      });
      return;
    }

    const now = Date.now();
    // Throttle: don't process if last process was less than 2 seconds ago
    if (now - lastProcessTimeRef.current < 2000) {
      console.log("[ALPR] Throttled - too soon since last scan");
      return;
    }

    try {
      setProcessing(true);
      lastProcessTimeRef.current = now;
      console.log("[ALPR] Starting scan...");

      // Double-check camera is still available before capturing
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        console.warn("[ALPR] Camera not ready");
        setProcessing(false);
        return;
      }

      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessing(false);
        return;
      }
      
      ctx.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.6);

      console.log("[ALPR] Photo captured, processing...");
      
      // Process the frame
      const data = await processALPRImage(imageBase64);
      
      // Convert web API response to mobile format
      const detections = (data.plates || []).map((plate) => ({
        registration: plate.text,
        confidence: plate.confidence,
      }));
      
      const bestDetection = getBestDetection(detections);

      if (bestDetection) {
        console.log("[ALPR] Detection found:", bestDetection.registration, "Confidence:", bestDetection.confidence);
        setLiveDetection(bestDetection);

        // Auto-capture if confidence is high enough (50%)
        if (autoCapture && bestDetection.confidence >= 0.5) {
          console.log("[ALPR] Auto-capturing - confidence threshold met!");
          await handleAutoCapture();
        } else {
          console.log("[ALPR] Detection found but confidence too low:", bestDetection.confidence, "< 0.5");
        }
      } else {
        console.log("[ALPR] No detection found in frame");
        setLiveDetection(null);
      }
    } catch (error) {
      const errorMessage = error?.message || "";
      const errorStatus = error?.response?.status || error?.status;
      
      // Handle authentication errors
      if (errorStatus === 401 || errorStatus === 403 || errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("Unauthorized") || errorMessage.includes("Forbidden")) {
        console.error("[ALPR] Authentication error:", errorMessage);
        setError("Authentication failed. Please log out and log back in.");
        stopAutoCapture();
        setServiceHealth(false);
        setLiveDetection(null);
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log out and log back in.",
          variant: "destructive",
          duration: 5000,
        });
      }
      // Handle server errors
      else if (errorStatus === 500 || errorStatus === 502 || errorStatus === 503 || errorMessage.includes("500") || errorMessage.includes("502") || errorMessage.includes("503") || errorMessage.includes("PIL") || errorMessage.includes("ANTIALIAS")) {
        // Don't set serviceHealth to false for timeout/wake-up errors
        if (errorMessage.includes("timeout") || errorMessage.includes("waking up") || errorMessage.includes("sleeping") || errorMessage.includes("unavailable") || errorStatus === 502 || errorStatus === 503) {
          setError("ALPR service is waking up (this can take 30-60 seconds). Please wait and try again.");
          toast({
            title: "Service Waking Up",
            description: "The ALPR service is starting. Please wait 30-60 seconds and try again.",
            variant: "default",
            duration: 5000,
          });
        } else {
          setServiceHealth(false);
          setError("ALPR service error. Please try again later.");
        }
        setLiveDetection(null);
        stopAutoCapture();
        console.error("[ALPR] Backend error detected:", errorMessage);
      } 
      // Handle connection errors
      else if (errorMessage.includes("ALPR service") || errorMessage.includes("Failed to connect") || errorMessage.includes("Network")) {
        setServiceHealth(false);
        stopAutoCapture();
        console.error("[ALPR] Connection error:", errorMessage);
        setError("Cannot connect to ALPR service. Please check your connection.");
      } 
      // Handle other errors silently during scanning (don't stop auto-capture for transient errors)
      else {
        console.warn("[ALPR] Transient error during scan, continuing:", errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoCapture = async () => {
    if (!videoRef.current) return;

    // Stop scanning immediately
    stopAutoCapture();
    setLiveDetection(null);
    setProcessing(true);

    try {
      // Capture a fresh, high-quality image
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessing(false);
        return;
      }
      
      ctx.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);

      // Set the captured image immediately
      setCapturedImage(imageBase64);
      setMode("manual");
      
      // Process the captured image
      await processImageWithBase64(imageBase64);
    } catch (error) {
      console.error("[ALPR] Auto-capture error:", error?.message);
      setProcessing(false);
      setMode("preview");
      // Resume auto-capture after a short delay
      setTimeout(() => {
        if (autoCapture) {
          setAutoCapture(true);
        }
      }, 1000);
    }
  };

  const handleManualCapture = async () => {
    if (!videoRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

      setCapturedImage(imageBase64);
      setDetection(null);
      setMode("manual");
      stopAutoCapture();
      await processImageWithBase64(imageBase64);
    } catch (error) {
      console.error("[ALPR] Manual capture error:", error?.message);
      toast({
        title: "Error",
        description: `Failed to capture image: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handlePickFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        setCapturedImage(base64);
        setDetection(null);
        setMode("manual");
        stopAutoCapture();
        await processImageWithBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageWithBase64 = async (imageBase64) => {
    if (!imageBase64) {
      setError('No image to process');
      return;
    }

    setProcessing(true);
    setError(null);
    setDetection(null);

    try {
      const result = await processALPRImage(imageBase64);
      
      // Convert web API response to mobile format
      const detections = (result.plates || []).map((plate) => ({
        registration: plate.text,
        confidence: plate.confidence,
      }));
      
      const bestDetection = getBestDetection(detections);
      
      if (bestDetection) {
        setDetection(bestDetection);
      } else {
        setDetection(null);
      }
    } catch (err) {
      const errorMessage = err?.message || "";
      const errorStatus = err?.response?.status || err?.status;
      const isNormalFailure = 
        errorMessage.includes("No license plate") || 
        errorMessage.includes("No detection");
      
      // Handle authentication errors
      if (errorStatus === 401 || errorStatus === 403 || errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("Unauthorized") || errorMessage.includes("Forbidden")) {
        setError("Authentication failed. Please log out and log back in.");
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log out and log back in.",
          variant: "destructive",
          duration: 5000,
        });
      }
      // Handle server errors
      else if (errorStatus === 500 || errorStatus === 502 || errorStatus === 503 || errorMessage.includes("500") || errorMessage.includes("502") || errorMessage.includes("503")) {
        if (errorMessage.includes("timeout") || errorMessage.includes("waking up") || errorMessage.includes("sleeping") || errorMessage.includes("unavailable") || errorStatus === 502 || errorStatus === 503) {
          setError("ALPR service is waking up (this can take 30-60 seconds). Please wait and try again.");
          toast({
            title: "Service Waking Up",
            description: "The ALPR service is starting. Please wait 30-60 seconds and try again.",
            variant: "default",
            duration: 5000,
          });
        } else {
          setError("ALPR service error. Please try again later.");
          toast({
            title: "Server Error",
            description: errorMessage || "The ALPR service encountered an error. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }
      // Only show error for non-normal failures
      else if (!isNormalFailure) {
        setError(err.message || 'Failed to process image');
        console.error('ALPR processing error:', err);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Search for vehicle by registration
  const searchVehicle = (registration) => {
    if (!vehicles || vehicles.length === 0) {
      setMatchedVehicle(null);
      return;
    }

    const searchTerm = registration.trim();
    const searchUpper = searchTerm.toUpperCase().trim();
    const normalizedSearch = normalizeRegistration(searchTerm);

    // Step 1: Try exact match (normalized)
    let vehicle = vehicles.find((v) => {
      if (!v.is_active) return false;
      const normalizedReg = normalizeRegistration(v.registration_plate || "");
      return normalizedReg === normalizedSearch;
    });

    // Step 2: Check split registrations
    if (!vehicle) {
      vehicle = vehicles.find((v) => {
        if (!v.is_active) return false;
        const regUpper = v.registration_plate?.toUpperCase() || "";
        const normalizedReg = normalizeRegistration(v.registration_plate || "");
        
        if (normalizedReg.includes(normalizedSearch)) return true;
        if (regUpper.includes(searchUpper)) return true;
        
        if (regUpper.includes('/')) {
          const regParts = regUpper
            .split(/\s*\/\s*/)
            .map((p) => normalizeRegistration(p))
            .filter((p) => p.length > 0);
          return regParts.some((part) => part === normalizedSearch);
        }
        return false;
      });
    }

    // Step 3: Check permit number
    if (!vehicle) {
      vehicle = vehicles.find((v) => 
        v.permit_number && 
        v.permit_number.trim().toUpperCase() === searchUpper &&
        v.is_active
      );
    }

    setMatchedVehicle(vehicle);
  };

  const handleUseRegistration = () => {
    const regToUse = detection?.registration || liveDetection?.registration;
    if (!regToUse) return;

    searchVehicle(regToUse);
    setShowLogging(true);
  };

  const handleLogVehicle = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to log vehicles.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const regToUse = detection?.registration || liveDetection?.registration;
    if (!regToUse) return;

    setLogging(true);

    let logData;
    if (matchedVehicle) {
      logData = {
        registration_plate: matchedVehicle.registration_plate,
        parking_type: matchedVehicle.parking_type,
        notes: matchedVehicle.permit_number
          ? `Permit: ${matchedVehicle.permit_number}`
          : "No permit",
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm"),
      };
    } else {
      logData = {
        registration_plate: regToUse.toUpperCase().trim(),
        parking_type: "Red",
        notes: "No permit - Unregistered vehicle",
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm"),
      };
    }

    try {
      await createParkingLog(logData);
      
      const successToast = toast({
        title: 'Vehicle Logged Successfully',
        description: `Plate ${regToUse} has been logged.`,
      });
      
      // Auto-dismiss toast after 3 seconds - use quick remove
      setTimeout(() => {
        if (successToast?.dismiss) {
          successToast.dismiss(true); // true = quick remove
        } else if (successToast?.id) {
          dismiss(successToast.id);
        }
      }, 3000);

      setLoggingSuccess(true);
      setTimeout(() => {
        handleLoggingComplete();
      }, 1500);
    } catch (err) {
      console.error('Error logging vehicle:', err);
      const errorToast = toast({
        title: 'Error Logging Vehicle',
        description: err.message || 'Failed to log vehicle. Please try again.',
        variant: 'destructive',
      });
      
      // Auto-dismiss toast after 3 seconds - use quick remove
      setTimeout(() => {
        if (errorToast?.dismiss) {
          errorToast.dismiss(true); // true = quick remove
        } else if (errorToast?.id) {
          dismiss(errorToast.id);
        }
      }, 3000);
    } finally {
      setLogging(false);
    }
  };

  const handleLoggingComplete = () => {
    setShowLogging(false);
    setLoggingSuccess(false);
    setMatchedVehicle(null);
    // Clear detection and image but keep camera active
    setCapturedImage(null);
    setDetection(null);
    setLiveDetection(null);
    setError(null);
    
    // Switch back to preview mode and ensure stream reattaches
    setMode("preview");
    
    // Force stream reattachment after a brief delay to ensure video element is ready
    if (stream && isCameraActive) {
      setTimeout(() => {
        if (videoRef.current && stream) {
          console.log('[ALPR] Reattaching stream after logging');
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
          });
        }
      }, 100);
    }
  };

  const handleClear = () => {
    setCapturedImage(null);
    setDetection(null);
    setLiveDetection(null);
    setMode("preview");
    setError(null);
    // Don't clear camera state - keep it active if it was active
    // The camera should remain running for continuous scanning
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      setError(null);
    } catch (err) {
      console.error('Camera start error:', err);
      setError('Failed to access camera: ' + (err?.message || 'Unknown error'));
      setIsCameraActive(false);
      setStream(null);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
    stopAutoCapture();
  };

  const [error, setError] = useState(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col items-center justify-center relative">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ALPR Scanner</h1>
          <p className="text-muted-foreground mt-1">
            Automatic License Plate Recognition
          </p>
        </div>
        {serviceChecked && serviceHealth !== null && (
          <div className="absolute top-0 right-0 flex items-center gap-2">
            {serviceHealth ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600">Service Online</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-600">Service Offline</span>
              </>
            )}
          </div>
        )}
      </div>

      {serviceChecked && !serviceHealth && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ALPR service is not available. Please ensure the Python ALPR service is running.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Camera Preview Mode - Always show camera area like mobile app */}
      {mode === "preview" && (
        <>
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            {/* Camera Video - Always render to keep ref available */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              style={{ display: isCameraActive ? 'block' : 'none' }}
            />
            
            {/* Placeholder when camera not active */}
            {!isCameraActive && (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-900 z-10">
                <Camera className="h-16 w-16 text-slate-400" />
                <div className="text-white text-center">
                  <p className="text-lg font-semibold mb-2">Camera Not Started</p>
                  <p className="text-sm text-slate-400">Tap the camera button below to start</p>
                </div>
              </div>
            )}
            
            {/* Live Detection Overlay - Top center, doesn't cover much */}
            {liveDetection && isCameraActive && (
              <div className="absolute top-3 left-0 right-0 flex justify-center z-20">
                <div className={`px-3 py-2 rounded-lg shadow-lg ${
                  liveDetection.confidence >= 0.5 
                    ? 'bg-green-600/95' 
                    : 'bg-blue-600/95'
                }`}>
                  <div className="text-white text-center">
                    <div className="text-lg font-bold font-mono">
                      {liveDetection.registration}
                    </div>
                    <div className="text-xs opacity-90">
                      {Math.round(liveDetection.confidence * 100)}% confidence
                    </div>
                    {autoCapture && liveDetection.confidence >= 0.5 && (
                      <div className="text-xs mt-1 font-semibold">
                        ✓ Auto-capturing...
                      </div>
                    )}
                    {autoCapture && liveDetection.confidence < 0.5 && (
                      <div className="text-xs mt-1 opacity-80">
                        Need {Math.round((0.5 - liveDetection.confidence) * 100)}% more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Processing Indicator - Top right, small */}
            {processing && isCameraActive && (
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full z-20">
                <Loader2 className="h-3 w-3 animate-spin text-white" />
                <span className="text-white text-xs font-medium">Scanning...</span>
              </div>
            )}

            {/* Minimal Controls Overlay - Bottom, compact */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 flex items-center justify-around z-20">
              {isCameraActive ? (
                <>
                  <Button
                    onClick={() => setAutoCapture(!autoCapture)}
                    variant={autoCapture ? "default" : "outline"}
                    className={autoCapture ? "bg-green-600 hover:bg-green-700 text-white border-0" : "bg-white/25 hover:bg-white/35 text-white border-white/40 backdrop-blur-sm"}
                    disabled={processing}
                    size="sm"
                  >
                    {autoCapture ? (
                      <span className="text-xs">Auto ON</span>
                    ) : (
                      <span className="text-xs">Auto OFF</span>
                    )}
                  </Button>

                  <Button
                    onClick={handleManualCapture}
                    className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 p-0 border-2 border-gray-300 shadow-lg"
                    disabled={processing}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-800" />
                  </Button>

                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="bg-red-500/80 hover:bg-red-600/90 text-white border-red-400/50 backdrop-blur-sm"
                    disabled={processing}
                    size="sm"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Stop</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="bg-white/25 hover:bg-white/35 text-white border-white/40 backdrop-blur-sm"
                    disabled={processing}
                    size="sm"
                  >
                    <Camera className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Start</span>
                  </Button>

                  <Button
                    onClick={startCamera}
                    className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 p-0 border-2 border-gray-300 shadow-lg"
                    disabled={processing}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-800" />
                  </Button>

                  <Button
                    onClick={handlePickFromGallery}
                    variant="outline"
                    className="bg-white/25 hover:bg-white/35 text-white border-white/40 backdrop-blur-sm"
                    disabled={processing}
                    size="sm"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mode Toggle Info */}
          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <div className="text-center text-sm text-slate-600">
              {!isCameraActive ? (
                "Start camera to begin scanning"
              ) : autoCapture ? (
                `Auto-capture: Scanning every 2s... Will capture when plate detected (≥50% confidence)${processing ? " [Processing...]" : ""}`
              ) : (
                "Manual mode - Tap capture button to take photo"
              )}
            </div>
            {!processing && autoCapture && isCameraActive && (
              <div className="text-center text-xs text-slate-500 mt-2 italic">
                {liveDetection 
                  ? `Detected: ${liveDetection.registration} (${Math.round(liveDetection.confidence * 100)}%)`
                  : "Point camera at license plate..."}
              </div>
            )}
          </div>
        </>
      )}

      {/* Manual Capture Mode - Show Image */}
      {mode === "manual" && capturedImage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Captured Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative w-full aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
                {processing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                    <span className="text-white font-medium">Processing image...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detection Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!processing && detection ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">
                      Detected Registration:
                    </div>
                    <div className="text-2xl font-bold font-mono mb-2">
                      {detection.registration}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence: {Math.round(detection.confidence * 100)}%
                    </div>
                  </div>

                  <Button
                    onClick={handleUseRegistration}
                    className="w-full"
                    size="lg"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Use This Registration
                  </Button>
                </div>
              ) : !processing ? (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg text-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <div className="font-semibold text-yellow-900 mb-1">
                    No license plate detected
                  </div>
                  <div className="text-sm text-yellow-700">
                    Try again with a clearer image of the license plate
                  </div>
                </div>
              ) : null}

              <Button
                onClick={handleClear}
                variant="outline"
                className="w-full"
              >
                Clear & Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logging Modal */}
      <Dialog open={showLogging} onOpenChange={setShowLogging}>
        <DialogContent>
          {loggingSuccess ? (
            <div className="flex flex-col items-center py-6 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <DialogTitle className="text-xl text-green-600">
                Vehicle Logged Successfully!
              </DialogTitle>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Log Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-slate-100 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">
                    {detection?.registration || liveDetection?.registration}
                  </div>
                </div>

                {matchedVehicle ? (
                  <div className="p-4 bg-green-50 rounded-lg space-y-2">
                    <div className="font-semibold text-sm text-slate-600 mb-2">
                      Vehicle Found:
                    </div>
                    <div className="text-sm text-slate-700">
                      Permit: {matchedVehicle.permit_number || "N/A"}
                    </div>
                    <div className="text-sm text-slate-700">
                      Type: {matchedVehicle.parking_type || "N/A"}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="font-semibold text-red-600 mb-1">
                      Unregistered Vehicle
                    </div>
                    <div className="text-sm text-slate-600">
                      This vehicle is not in the system
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleLogVehicle}
                  disabled={logging}
                  className="w-full"
                  size="lg"
                >
                  {logging ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Log Vehicle
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
