/**
 * Determines parking type based on permit number
 * Permits from 00602 (602) onwards are Yellow permits
 * Permits below 602 are Green permits
 * 
 * @param {string|number} permitNumber - The permit number (e.g., "00602", "602", 602)
 * @param {string} defaultType - Default parking type if permit number is invalid (default: "Green")
 * @returns {string} - "Yellow" or "Green"
 */
export function getParkingTypeFromPermit(permitNumber, defaultType = "Green") {
  if (!permitNumber) {
    return defaultType;
  }

  // Convert to string and remove leading zeros for comparison
  const permitStr = String(permitNumber).trim();
  if (!permitStr) {
    return defaultType;
  }

  // Parse the number (handles "00602", "602", etc.)
  const permitNum = parseInt(permitStr, 10);
  
  if (isNaN(permitNum)) {
    return defaultType;
  }

  // Permits from 602 onwards are Yellow
  return permitNum >= 602 ? "Yellow" : "Green";
}

/**
 * Auto-assigns parking type based on permit number if not explicitly set
 * 
 * @param {object} vehicleData - Vehicle data object
 * @returns {object} - Vehicle data with parking_type set if needed
 */
export function autoAssignParkingType(vehicleData) {
  // If parking_type is already set and not empty, use it
  if (vehicleData.parking_type && vehicleData.parking_type.trim()) {
    return vehicleData;
  }

  // If no permit number, it's Red (unregistered)
  if (!vehicleData.permit_number || !vehicleData.permit_number.trim()) {
    return {
      ...vehicleData,
      parking_type: "Red"
    };
  }

  // Otherwise, determine from permit number (602+ = Yellow, <602 = Green)
  const autoType = getParkingTypeFromPermit(vehicleData.permit_number, "Green");
  return {
    ...vehicleData,
    parking_type: autoType
  };
}

