import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ANPRDetection,
  checkANPRHealthMobile,
  processANPRImageMobile,
} from "@/api/anpr";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ANPRScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detections, setDetections] = useState<ANPRDetection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
      }
    };
  }, []);

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission is required to use ANPR.");
      return false;
    }
    return true;
  };

  const handleStartCamera = async () => {
    setError(null);
    const ok = await ensureCameraPermission();
    if (!ok) return;
    setIsCameraActive(true);
  };

  const handleStopCamera = () => {
    setIsCameraActive(false);
    setAutoCapture(false);
    if (autoCaptureRef.current) {
      clearInterval(autoCaptureRef.current);
      autoCaptureRef.current = null;
    }
  };

  const handleProcess = async (base64: string) => {
    try {
      setProcessing(true);
      setError(null);
      setDetections(null);

      const health = await checkANPRHealthMobile();
      setServiceOnline(health);
      if (!health) {
        setError(
          "ANPR service appears offline. Please ensure the OVH ANPR service is running."
        );
        return;
      }

      const response = await processANPRImageMobile(base64);
      setDetections(response.detections);
      if (response.detections.length === 0) {
        setError("No license plates detected.");
      }
    } catch (e: any) {
      console.error("ANPR mobile error:", e);
      setError(e.message || "Failed to process image.");
    } finally {
      setProcessing(false);
    }
  };

  const captureAndProcess = async () => {
    if (!isCameraActive) {
      setError("Please start the camera first.");
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    };

    const result = await ImagePicker.launchCameraAsync(options);
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset || !asset.base64) {
      setError("Could not read image data.");
      return;
    }

    setImageUri(asset.uri ?? null);
    await handleProcess(asset.base64);
  };

  const toggleAutoCapture = () => {
    if (!isCameraActive) {
      setError("Please start the camera first.");
      return;
    }

    if (autoCapture) {
      setAutoCapture(false);
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
        autoCaptureRef.current = null;
      }
      return;
    }

    setAutoCapture(true);
    autoCaptureRef.current = setInterval(() => {
      captureAndProcess().catch((e) =>
        console.error("Auto capture error:", e)
      );
    }, 3000);
  };

  const handleUploadImage = async () => {
    setError(null);
    setDetections(null);

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset || !asset.base64) {
      setError("Could not read image data.");
      return;
    }

    setImageUri(asset.uri ?? null);
    await handleProcess(asset.base64);
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          ANPR System
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Real-time Automatic Number Plate Recognition
        </ThemedText>
        {serviceOnline === false && (
          <Text style={styles.serviceOffline}>
            ANPR service offline. Please check the OVH service status.
          </Text>
        )}
      </View>

      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Camera / Upload
          </ThemedText>
          <ThemedText style={styles.cardSubtitle}>
            Start camera, capture frames, or upload an image
          </ThemedText>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.previewContainer}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.preview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewPlaceholderText}>
                  Camera {isCameraActive ? "active" : "not active"}
                </Text>
                <Text style={styles.previewPlaceholderSub}>
                  Use the buttons below to start camera, capture & process, or
                  upload an image
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <Button
                title={isCameraActive ? "Stop Camera" : "Start Camera"}
                onPress={isCameraActive ? handleStopCamera : handleStartCamera}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                title="Capture & Process"
                onPress={captureAndProcess}
                disabled={!isCameraActive || processing}
              />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <Button
                title={autoCapture ? "Stop Auto Capture" : "Auto Capture"}
                onPress={toggleAutoCapture}
                disabled={!isCameraActive}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button title="Upload Image" onPress={handleUploadImage} />
            </View>
          </View>

          {processing && (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.processingText}>Processing image...</Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Detection Results
          </ThemedText>
          <ThemedText style={styles.cardSubtitle}>
            Detected license plates and confidence scores
          </ThemedText>
        </View>

        <View style={styles.cardBody}>
          {detections && detections.length > 0 ? (
            <>
              {detections.map((d, idx) => (
                <View key={idx} style={styles.detectionRow}>
                  <View style={styles.detectionLeft}>
                    <Text style={styles.plateText}>{d.registration}</Text>
                    <Text style={styles.confText}>
                      Confidence: {(d.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>#{idx + 1}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.noResultsText}>
              No detections yet. Use Capture & Process or Upload Image to see
              results.
            </Text>
          )}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 16,
    gap: 12,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  serviceOffline: {
    marginTop: 6,
    color: "#b91c1c",
    fontSize: 13,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  cardBody: {
    gap: 8,
  },
  previewContainer: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    height: 220,
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  previewPlaceholderText: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "600",
  },
  previewPlaceholderSub: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  processingText: {
    fontSize: 13,
    color: "#4b5563",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    marginTop: 4,
  },
  detectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  detectionLeft: {
    flex: 1,
  },
  plateText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  noResultsText: {
    fontSize: 13,
    color: "#6b7280",
  },
});
