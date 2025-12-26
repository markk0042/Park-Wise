import axios from 'axios';
import { listVehicles } from './vehicle.service.js';
import { env } from '../config/env.js';

const ALPR_SERVICE_URL = env.ALPR_SERVICE_URL;

// Log the ALPR service URL on module load (for debugging)
console.log(`[ALPR Service] ALPR_SERVICE_URL configured as: ${ALPR_SERVICE_URL}`);

/**
 * Process an image through the ALPR service
 * @param {string} imageBase64 - Base64 encoded image (without data URL prefix)
 * @returns {Promise<Object>} ALPR detection results
 */
export const processALPRImage = async (imageBase64) => {
  try {
    const processUrl = `${ALPR_SERVICE_URL}/process`;
    console.log(`[ALPR Process] Sending image to: ${processUrl}`);
    console.log(`[ALPR Process] Image size: ${(imageBase64.length / 1024).toFixed(2)} KB (base64)`);
    
    // Send base64 image as JSON (matching mobile app format)
    // Increased timeout to 90 seconds for Render free tier cold starts
    const response = await axios.post(processUrl, {
      image: imageBase64
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 90000, // 90 second timeout for processing (free tier cold starts can take 30-60s)
    });
    
    console.log(`[ALPR Process] Response received: ${response.status}`);

    // Convert mobile app response format to web app format
    const data = response.data;
    
    if (!data.success) {
      return {
        success: false,
        plates: [],
        count: 0,
        message: data.error || 'No license plates detected',
      };
    }

    // Convert detections array to plates array format
    const plates = (data.detections || []).map((detection) => ({
      text: detection.registration,
      confidence: detection.confidence,
      detection_confidence: detection.bbox ? detection.bbox[0] : detection.confidence,
      bbox: detection.bbox,
    }));

    return {
      success: true,
      plates: plates,
      count: plates.length,
      annotated_image: data.annotated_image,
    };
  } catch (error) {
    console.error('[ALPR Process] Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: `${ALPR_SERVICE_URL}/process`,
    });
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('aborted')) {
      throw new Error('ALPR service request timed out. The service may be waking up from sleep. Please try again in a few seconds.');
    } else if (error.response) {
      const errorData = error.response.data;
      const errorMessage = errorData?.error || errorData?.message || 'ALPR processing failed';
      throw new Error(errorMessage);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error('ALPR service is not available. Please ensure the service is running.');
    } else {
      throw new Error(error.message || 'ALPR processing failed');
    }
  }
};

/**
 * Process ALPR image and lookup vehicle information from Supabase
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Combined ALPR and vehicle lookup results
 */
export const processALPRWithLookup = async (imageBase64) => {
  try {
    // Process image through ALPR
    const alprResult = await processALPRImage(imageBase64);

    if (!alprResult.success || !alprResult.plates || alprResult.plates.length === 0) {
      return {
        success: false,
        plates: [],
        count: 0,
        message: 'No license plates detected in the image',
      };
    }

    // Get all vehicles from database for lookup
    const vehicles = await listVehicles();
    
    // Create a lookup map for faster searching
    const vehicleMap = new Map();
    vehicles.forEach((vehicle) => {
      const reg = vehicle.registration_plate?.toUpperCase().replace(/[\s-]/g, '');
      if (reg) {
        vehicleMap.set(reg, vehicle);
      }
    });

    // Match detected plates with database
    const matchedPlates = alprResult.plates.map((plate) => {
      // Normalize plate text for matching
      const normalizedPlate = plate.text?.toUpperCase().replace(/[\s-]/g, '') || '';
      
      // Try to find matching vehicle
      let matchedVehicle = null;
      if (normalizedPlate && vehicleMap.has(normalizedPlate)) {
        matchedVehicle = vehicleMap.get(normalizedPlate);
      } else {
        // Try fuzzy matching (check if any vehicle registration contains the detected text)
        for (const [reg, vehicle] of vehicleMap.entries()) {
          if (reg.includes(normalizedPlate) || normalizedPlate.includes(reg)) {
            matchedVehicle = vehicle;
            break;
          }
        }
      }

      return {
        ...plate,
        in_database: !!matchedVehicle,
        vehicle_info: matchedVehicle || null,
      };
    });

    return {
      success: true,
      plates: matchedPlates,
      count: matchedPlates.length,
      annotated_image: alprResult.annotated_image,
    };
  } catch (error) {
    console.error('Error in ALPR processing with lookup:', error);
    throw error;
  }
};

/**
 * Check if ALPR service is available
 * @returns {Promise<boolean>} True if service is healthy
 */
export const checkALPRServiceHealth = async () => {
  try {
    const healthUrl = `${ALPR_SERVICE_URL}/api/health`;
    console.log(`[ALPR Health] Checking service at: ${healthUrl}`);
    console.log(`[ALPR Health] ALPR_SERVICE_URL env var: ${ALPR_SERVICE_URL}`);
    
    const response = await axios.get(healthUrl, {
      timeout: 10000, // Increased timeout to 10 seconds for Render's cold starts
    });
    
    console.log(`[ALPR Health] Response status: ${response.status}`);
    console.log(`[ALPR Health] Response data:`, JSON.stringify(response.data));
    
    const isHealthy = response.data.status === 'ok' && response.data.alpr_initialized === true;
    console.log(`[ALPR Health] Service healthy: ${isHealthy}`);
    
    return isHealthy;
  } catch (error) {
    console.error('[ALPR Health] Error checking service:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: `${ALPR_SERVICE_URL}/api/health`,
    });
    return false;
  }
};

