import axios from 'axios';
import { listVehicles } from './vehicle.service.js';

const ANPR_SERVICE_URL = process.env.ANPR_SERVICE_URL || 'http://localhost:5000';

/**
 * Process an image through the ANPR service
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Array>} Array of detected license plates
 */
export const processANPRImage = async (imageBase64) => {
  try {
    const response = await axios.post(`${ANPR_SERVICE_URL}/process`, {
      image: imageBase64
    }, {
      timeout: 30000 // 30 second timeout
    });

    if (response.data.success) {
      return response.data.detections || [];
    }

    throw new Error(response.data.error || 'ANPR processing failed');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ANPR service is not available. Please ensure the service is running.');
    }
    throw error;
  }
};

/**
 * Lookup vehicle information for detected registration plates
 * @param {Array<string>} registrations - Array of registration plate strings
 * @returns {Promise<Array>} Array of vehicle information
 */
export const lookupVehicles = async (registrations) => {
  if (!registrations || registrations.length === 0) {
    return [];
  }

  try {
    // Get all vehicles
    const allVehicles = await listVehicles({ orderBy: 'registration_plate' });

    // Normalize registrations for matching (uppercase, remove spaces)
    const normalizedRegistrations = registrations.map(reg => 
      reg.toUpperCase().replace(/\s+/g, '')
    );

    // Find matching vehicles
    const matches = allVehicles.filter(vehicle => {
      const normalizedPlate = vehicle.registration_plate
        .toUpperCase()
        .replace(/\s+/g, '');
      
      return normalizedRegistrations.includes(normalizedPlate);
    });

    return matches;
  } catch (error) {
    console.error('Error looking up vehicles:', error);
    return [];
  }
};

/**
 * Process ANPR image and lookup vehicle information
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Combined ANPR and vehicle lookup results
 */
export const processANPRWithLookup = async (imageBase64) => {
  try {
    // Process image through ANPR
    const detections = await processANPRImage(imageBase64);

    if (detections.length === 0) {
      return {
        detections: [],
        vehicles: [],
        summary: {
          totalDetected: 0,
          matched: 0,
          unmatched: 0
        }
      };
    }

    // Extract registration plates
    const registrations = detections.map(d => d.registration);

    // Lookup vehicles in database
    const vehicles = await lookupVehicles(registrations);

    // Create a map of vehicles by registration
    const vehicleMap = new Map();
    vehicles.forEach(vehicle => {
      const normalizedPlate = vehicle.registration_plate
        .toUpperCase()
        .replace(/\s+/g, '');
      vehicleMap.set(normalizedPlate, vehicle);
    });

    // Combine detections with vehicle info
    const enrichedDetections = detections.map(detection => {
      const normalizedReg = detection.registration.toUpperCase().replace(/\s+/g, '');
      const vehicle = vehicleMap.get(normalizedReg);

      return {
        ...detection,
        vehicle: vehicle || null,
        matched: !!vehicle
      };
    });

    return {
      detections: enrichedDetections,
      vehicles: vehicles,
      summary: {
        totalDetected: detections.length,
        matched: vehicles.length,
        unmatched: detections.length - vehicles.length
      }
    };
  } catch (error) {
    console.error('Error in ANPR processing with lookup:', error);
    throw error;
  }
};

/**
 * Check if ANPR service is available
 * @returns {Promise<boolean>}
 */
export const checkANPRServiceHealth = async () => {
  try {
    const response = await axios.get(`${ANPR_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data.status === 'healthy';
  } catch (error) {
    return false;
  }
};

