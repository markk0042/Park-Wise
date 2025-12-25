import axios from 'axios';
import { listVehicles } from './vehicle.service.js';
import { env } from '../config/env.js';

const ALPR_SERVICE_URL = env.ALPR_SERVICE_URL;

/**
 * Process an image through the ALPR service
 * @param {string} imageBase64 - Base64 encoded image (without data URL prefix)
 * @returns {Promise<Object>} ALPR detection results
 */
export const processALPRImage = async (imageBase64) => {
  try {
    // Send base64 image as JSON (matching mobile app format)
    const response = await axios.post(`${ALPR_SERVICE_URL}/process`, {
      image: imageBase64
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout for processing
    });

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
    if (error.response) {
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
    const response = await axios.get(`${ALPR_SERVICE_URL}/api/health`, {
      timeout: 5000,
    });
    return response.data.status === 'ok' && response.data.alpr_initialized === true;
  } catch (error) {
    return false;
  }
};

