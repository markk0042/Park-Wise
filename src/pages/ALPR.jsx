import React, { useState, useRef } from 'react';
import { processALPRImage, checkALPRHealth, createParkingLog } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function ALPR() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [serviceChecked, setServiceChecked] = useState(false); // Track if service check is complete
  const [logging, setLogging] = useState({}); // Track logging state per plate
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureIntervalRef = useRef(null);
  const { toast } = useToast();
  const { profile: user } = useAuth();

  // Check service health on mount
  React.useEffect(() => {
    checkServiceHealth();
  }, []);

  const checkServiceHealth = async () => {
    try {
      const result = await checkALPRHealth();
      setServiceStatus(result.service_available);
    } catch (err) {
      setServiceStatus(false);
    } finally {
      setServiceChecked(true); // Mark that we've checked the service
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setImage(base64);
        setImagePreview(base64);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Failed to access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
      setAutoCapture(false);
    }
  };

  const captureFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      setImage(base64);
      setImagePreview(base64);
      setResults(null);
      setError(null);
    }
  };

  const toggleAutoCapture = () => {
    if (autoCapture) {
      // Stop auto capture
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
      setAutoCapture(false);
    } else {
      // Start auto capture
      if (!isCameraActive) {
        startCamera();
      }
      setAutoCapture(true);
      autoCaptureIntervalRef.current = setInterval(() => {
        captureFromCamera();
        processImage();
      }, 3000); // Capture every 3 seconds
    }
  };

  const processImage = async () => {
    if (!image) {
      setError('Please select or capture an image first');
      return;
    }

    setProcessing(true);
    setError(null);
    setResults(null);

    try {
      const result = await processALPRImage(image);
      
      if (result.success && result.plates && result.plates.length > 0) {
        setResults(result);
      } else {
        setError('No license plates detected in the image');
      }
    } catch (err) {
      setError(err.message || 'Failed to process image');
      console.error('ALPR processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const logVehicle = async (plate, index) => {
    setLogging(prev => ({ ...prev, [index]: true }));

    try {
      // Use parking_type from vehicle_info if available, otherwise default to Green
      const parkingType = plate.vehicle_info?.parking_type || 'Green';
      
      const logData = {
        registration_plate: plate.text,
        parking_type: parkingType,
        notes: `Logged via ALPR - Confidence: ${(plate.confidence * 100).toFixed(1)}%`,
      };

      await createParkingLog(logData);

      const successToast = toast({
        title: 'Vehicle Logged Successfully',
        description: `Plate ${plate.text} has been logged as ${parkingType} parking.`,
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        successToast.dismiss();
      }, 3000);

      // Clear image and results to allow scanning next vehicle
      setImage(null);
      setImagePreview(null);
      setResults(null);
      setError(null);
    } catch (err) {
      console.error('Error logging vehicle:', err);
      const errorToast = toast({
        title: 'Error Logging Vehicle',
        description: err.message || 'Failed to log vehicle. Please try again.',
        variant: 'destructive',
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        errorToast.dismiss();
      }, 3000);
    } finally {
      setLogging(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ALPR System</h1>
          <p className="text-muted-foreground mt-1">
            Automatic License Plate Recognition
          </p>
        </div>
        {serviceStatus !== null && (
          <div className="flex items-center gap-2">
            {serviceStatus ? (
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

      {serviceChecked && !serviceStatus && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ALPR service is not available. Please ensure the Python ALPR service is running.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Image Input</CardTitle>
            <CardDescription>
              Upload an image or capture from camera
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Preview */}
            {isCameraActive && (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && !isCameraActive && (
              <div className="relative w-full aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {!isCameraActive ? (
                <Button onClick={startCamera} variant="outline" className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="outline" className="flex-1">
                  <XCircle className="mr-2 h-4 w-4" />
                  Stop Camera
                </Button>
              )}
              
              {isCameraActive && (
                <>
                  <Button onClick={captureFromCamera} variant="default" className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    Capture & Process
                  </Button>
                  <Button
                    onClick={toggleAutoCapture}
                    variant={autoCapture ? "destructive" : "secondary"}
                    className="flex-1"
                  >
                    {autoCapture ? "Stop Auto Capture" : "Auto Capture"}
                  </Button>
                </>
              )}
              
              <Button onClick={handleImageUpload} variant="outline" className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {image && !isCameraActive && (
              <Button
                onClick={processImage}
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Image'
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Detection Results</CardTitle>
            <CardDescription>
              {results ? `${results.count} plate(s) detected` : 'No results yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {results?.annotated_image && (
              <div className="relative w-full aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={results.annotated_image}
                  alt="Annotated result"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {results?.plates && results.plates.length > 0 && (
              <div className="space-y-3">
                {results.plates.map((plate, index) => (
                  <Card key={index} className={plate.in_database ? 'border-green-500' : 'border-yellow-500'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold">{plate.text}</h3>
                            {plate.in_database ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                In Database
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                Not Found
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Confidence: {(plate.confidence * 100).toFixed(1)}%</p>
                            <p>Detection: {(plate.detection_confidence * 100).toFixed(1)}%</p>
                          </div>

                          {plate.vehicle_info && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg">
                              <p className="font-semibold text-sm mb-1">Vehicle Information:</p>
                              <div className="text-sm space-y-1">
                                {plate.vehicle_info.registration_plate && (
                                  <p>Plate: {plate.vehicle_info.registration_plate}</p>
                                )}
                                {plate.vehicle_info.permit_number && (
                                  <p>Permit: {plate.vehicle_info.permit_number}</p>
                                )}
                                {plate.vehicle_info.parking_type && (
                                  <p>Type: {plate.vehicle_info.parking_type}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Log Vehicle Button */}
                          <div className="mt-4">
                            <Button
                              onClick={() => logVehicle(plate, index)}
                              disabled={logging[index]}
                              variant="default"
                              className="w-full"
                              size="sm"
                            >
                              {logging[index] ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Logging...
                                </>
                              ) : (
                                <>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Log Vehicle
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!results && !error && !processing && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results yet. Upload or capture an image to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

