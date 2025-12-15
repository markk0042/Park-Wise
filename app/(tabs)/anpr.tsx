import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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

export default function ANPRScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detections, setDetections] = useState<ANPRDetection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);

  const pickImage = async (fromCamera: boolean) => {
    setError(null);
    setDetections(null);

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    };

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset || !asset.base64) {
      setError("Could not read image data.");
      return;
    }

    setImageUri(asset.uri ?? null);
    await handleProcess(asset.base64);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ANPR System (Mobile)</Text>
      <Text style={styles.subtitle}>
        Capture or upload an image to detect license plates using the OVH ANPR
        service.
      </Text>

      <View style={styles.buttonRow}>
        <Button title="Take Photo" onPress={() => pickImage(true)} />
        <Button title="Choose From Gallery" onPress={() => pickImage(false)} />
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      )}

      {processing && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.infoText}>Processing image...</Text>
        </View>
      )}

      {serviceOnline === false && (
        <Text style={styles.errorText}>
          ANPR service offline. Please check the OVH service status.
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {detections && detections.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Detections</Text>
          {detections.map((d, idx) => (
            <View key={idx} style={styles.detectionRow}>
              <Text style={styles.plateText}>{d.registration}</Text>
              <Text style={styles.confText}>
                Confidence: {(d.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.bboxText}>
                BBox: [{d.bbox.map((n) => Math.round(n)).join(", ")}]
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  preview: {
    width: "100%",
    height: 240,
    borderRadius: 8,
    backgroundColor: "#000",
    marginBottom: 16,
  },
  center: {
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    marginTop: 8,
  },
  errorText: {
    color: "red",
    marginBottom: 12,
  },
  results: {
    marginTop: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  detectionRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  plateText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confText: {
    fontSize: 14,
    color: "#555",
  },
  bboxText: {
    fontSize: 12,
    color: "#777",
  },
});


