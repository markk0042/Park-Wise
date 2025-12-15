// Simple ANPR API client for the mobile app.
// This talks directly to the Python ANPR service running on OVH.
// If you later move the service or front it with your Node backend,
// just update the base URL here.

const ANPR_SERVICE_URL = "http://54.37.18.249:5000";

export type ANPRDetection = {
  registration: string;
  confidence: number;
  bbox: [number, number, number, number];
};

export type ANPRProcessResponse = {
  success: boolean;
  detections: ANPRDetection[];
  count: number;
  error?: string;
};

export async function processANPRImageMobile(
  imageBase64: string
): Promise<ANPRProcessResponse> {
  // The Python service accepts either a data URL or pure base64.
  // We send pure base64 for efficiency.
  const res = await fetch(`${ANPR_SERVICE_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ANPR request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as ANPRProcessResponse;
  if (!data.success) {
    throw new Error(data.error || "ANPR processing failed");
  }
  return data;
}

export async function checkANPRHealthMobile(): Promise<boolean> {
  try {
    const res = await fetch(`${ANPR_SERVICE_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "healthy";
  } catch {
    return false;
  }
}


