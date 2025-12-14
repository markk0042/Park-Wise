import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Upload, X, CheckCircle2, AlertCircle, Loader2, Video, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { processANPRImage, checkANPRHealth } from '@/api';
import { createParkingLog } from '@/api';

export default function ANPR() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const { profile: user } = useAuth();

  // Check ANPR service health
  const { data: healthData } = useQuery({
    queryKey: ['anpr-health'],
    queryFn: checkANPRHealth,
    refetchInterval: 30000, // Check every 30 seconds
    onSuccess: (data) => {
      setServiceStatus(data.serviceAvailable ? 'available' : 'unavailable');
    }
  });

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure you have granted camera permissions.');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture frame from video
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Process captured image
  const processImage = useCallback(async (imageData) => {
    if (!imageData) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const result = await processANPRImage(imageData);
      setResults(result);
    } catch (err) {
      console.error('ANPR processing error:', err);
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Capture and process
  const handleCapture = useCallback(() => {
    const imageData = captureFrame();
    if (imageData) {
      processImage(imageData);
    }
  }, [captureFrame, processImage]);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      processImage(imageData);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  // Auto-capture mode (process every few seconds)
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureIntervalRef = useRef(null);

  useEffect(() => {
    if (autoCapture && isStreaming) {
      autoCaptureIntervalRef.current = setInterval(() => {
        handleCapture();
      }, 3000); // Capture every 3 seconds
    } else {
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
    }

    return () => {
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
      }
    };
  }, [autoCapture, isStreaming, handleCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Create parking log from detection
  const handleCreateLog = useCallback(async (detection) => {
    if (!detection.vehicle) {
      setError('Cannot create log: Vehicle not found in database.');
      return;
    }

    try {
      await createParkingLog({
        registration_plate: detection.registration,
        parking_type: detection.vehicle.parking_type,
        notes: `Auto-detected via ANPR (confidence: ${(detection.confidence * 100).toFixed(1)}%)`
      });
      
      setError(null);
      // Show success message
      alert(`Parking log created for ${detection.registration}`);
    } catch (err) {
      console.error('Error creating parking log:', err);
      setError('Failed to create parking log: ' + err.message);
    }
  }, []);

  const isAdmin = user?.role === 'admin' && user?.status === 'approved';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">ANPR System</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Real-time Automatic Number Plate Recognition
          </p>
        </div>
        {serviceStatus && (
          <Badge variant={serviceStatus === 'available' ? 'default' : 'destructive'}>
            {serviceStatus === 'available' ? 'Service Online' : 'Service Offline'}
          </Badge>
        )}
      </div>

      {serviceStatus === 'unavailable' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ANPR service is currently unavailable. Please ensure the Python ANPR service is running.
            See <code className="text-xs">anpr-service/README.md</code> for setup instructions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Camera/Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera / Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Preview */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: isStreaming ? 'block' : 'none' }}
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Camera not active</p>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {!isStreaming ? (
                <Button onClick={startCamera} className="flex-1">
                  <Video className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button onClick={stopCamera} variant="outline" className="flex-1">
                    <Square className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                  <Button
                    onClick={handleCapture}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Capture & Process
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setAutoCapture(!autoCapture)}
                    variant={autoCapture ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    {autoCapture ? 'Stop Auto' : 'Auto Capture'}
                  </Button>
                </>
              )}

              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button
                  as="span"
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Detection Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-slate-600">Processing image...</span>
              </div>
            )}

            {results && !isProcessing && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                      {results.summary?.totalDetected || 0}
                    </div>
                    <div className="text-xs text-slate-600">Detected</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {results.summary?.matched || 0}
                    </div>
                    <div className="text-xs text-slate-600">Matched</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">
                      {results.summary?.unmatched || 0}
                    </div>
                    <div className="text-xs text-slate-600">Unmatched</div>
                  </div>
                </div>

                {/* Detections */}
                {results.detections && results.detections.length > 0 ? (
                  <div className="space-y-3">
                    {results.detections.map((detection, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          detection.matched
                            ? 'border-green-200 bg-green-50'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                              {detection.registration}
                            </div>
                            <div className="text-xs text-slate-600">
                              Confidence: {(detection.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                          <Badge variant={detection.matched ? 'default' : 'outline'}>
                            {detection.matched ? 'In Database' : 'Not Found'}
                          </Badge>
                        </div>

                        {detection.vehicle && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-slate-600">Permit:</span>{' '}
                                <span className="font-semibold">
                                  {detection.vehicle.permit_number || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-600">Type:</span>{' '}
                                <Badge
                                  className={
                                    detection.vehicle.parking_type === 'Green'
                                      ? 'bg-green-100 text-green-800'
                                      : detection.vehicle.parking_type === 'Yellow'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                  }
                                >
                                  {detection.vehicle.parking_type}
                                </Badge>
                              </div>
                            </div>
                            {isAdmin && (
                              <Button
                                size="sm"
                                className="mt-3 w-full"
                                onClick={() => handleCreateLog(detection)}
                              >
                                Create Parking Log
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No license plates detected in the image.
                  </div>
                )}
              </div>
            )}

            {!results && !isProcessing && !error && (
              <div className="text-center py-8 text-slate-400">
                Capture an image or upload a photo to see detection results.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

