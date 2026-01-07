import { supabaseAdmin } from '../config/supabase.js';

const VEHICLE_TABLE = 'vehicles';

export const listVehicles = async ({ orderBy = 'permit_number', ascending = true } = {}) => {
  // Supabase defaults to returning a maximum of 1,000 rows unless a range is specified.
  // To ensure we see the full vehicle database (e.g. 1,900+ registrations),
  // explicitly request a larger range.
  const { data, error } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .select('*')
    .order(orderBy, { ascending })
    .range(0, 4999); // Support up to 5,000 vehicles in one query

  if (error) throw error;
  return data;
};

export const createVehicle = async (payload) => {
  const { data, error } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .insert({ ...payload })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const updateVehicle = async (id, payload) => {
  const { data, error } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .update({ ...payload })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteVehicle = async (id) => {
  const { error } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const deleteAllVehicles = async () => {
  // Delete all vehicles by selecting all IDs first, then deleting them
  // This avoids UUID comparison issues
  const { data: allVehicles, error: fetchError } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .select('id');
  
  if (fetchError) throw fetchError;
  
  if (!allVehicles || allVehicles.length === 0) {
    return; // Nothing to delete
  }
  
  // Delete in batches to avoid overwhelming the database
  const batchSize = 500;
  for (let i = 0; i < allVehicles.length; i += batchSize) {
    const batch = allVehicles.slice(i, i + batchSize);
    const ids = batch.map(v => v.id);
    
    const { error } = await supabaseAdmin
      .from(VEHICLE_TABLE)
      .delete()
      .in('id', ids);
    
    if (error) throw error;
  }
};

export const bulkInsertVehicles = async (vehicles) => {
  const chunkSize = 500;
  for (let i = 0; i < vehicles.length; i += chunkSize) {
    const slice = vehicles.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin
      .from(VEHICLE_TABLE)
      .insert(slice);
    if (error) throw error;
  }
};

/**
 * Bulk upsert vehicles: Update existing vehicles by registration_plate, or insert new ones
 * Returns counts of updated and inserted vehicles
 */
export const bulkUpsertVehicles = async (vehicles) => {
  if (!vehicles || vehicles.length === 0) {
    return { updated: 0, inserted: 0, total: 0 };
  }

  let updatedCount = 0;
  let insertedCount = 0;
  const chunkSize = 100; // Smaller chunks for upsert to handle queries

  for (let i = 0; i < vehicles.length; i += chunkSize) {
    const slice = vehicles.slice(i, i + chunkSize);
    
    // Get registration plates for this chunk
    const registrationPlates = slice
      .map(v => v.registration_plate?.toUpperCase().trim())
      .filter(Boolean);

    if (registrationPlates.length === 0) continue;

    // Check which vehicles already exist
    const { data: existingVehicles, error: fetchError } = await supabaseAdmin
      .from(VEHICLE_TABLE)
      .select('id, registration_plate')
      .in('registration_plate', registrationPlates);

    if (fetchError) throw fetchError;

    // Create a map of existing vehicles by registration_plate
    const existingMap = new Map();
    if (existingVehicles) {
      existingVehicles.forEach(v => {
        existingMap.set(v.registration_plate.toUpperCase().trim(), v.id);
      });
    }

    // Separate vehicles into updates and inserts
    const toUpdate = [];
    const toInsert = [];

    for (const vehicle of slice) {
      const regPlate = vehicle.registration_plate?.toUpperCase().trim();
      if (!regPlate) continue;

      const existingId = existingMap.get(regPlate);
      if (existingId) {
        // Vehicle exists, prepare for update
        toUpdate.push({
          id: existingId,
          ...vehicle,
          updated_at: new Date().toISOString()
        });
      } else {
        // New vehicle, prepare for insert
        toInsert.push(vehicle);
      }
    }

    // Update existing vehicles
    if (toUpdate.length > 0) {
      for (const vehicle of toUpdate) {
        const { id, ...updateData } = vehicle;
        const { error } = await supabaseAdmin
          .from(VEHICLE_TABLE)
          .update(updateData)
          .eq('id', id);
        if (error) throw error;
        updatedCount++;
      }
    }

    // Insert new vehicles
    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from(VEHICLE_TABLE)
        .insert(toInsert);
      if (error) throw error;
      insertedCount += toInsert.length;
    }
  }

  return {
    updated: updatedCount,
    inserted: insertedCount,
    total: updatedCount + insertedCount
  };
};

/**
 * Bulk replace vehicles: Delete all existing vehicles, then insert new ones
 * This ensures a complete replacement of the vehicle database
 * Auto-assigns parking types based on permit numbers (602+ = Yellow, <602 = Green)
 */
export const bulkReplaceVehicles = async (vehicles) => {
  if (!vehicles || vehicles.length === 0) {
    // If no vehicles provided, just delete all
    await deleteAllVehicles();
    return { deleted: 0, inserted: 0, total: 0 };
  }

  // First, delete all existing vehicles
  await deleteAllVehicles();

  // Then insert all new vehicles
  // Auto-assign parking types based on permit numbers
  const vehiclesWithAutoTypes = vehicles.map(vehicle => {
    const permitNum = vehicle.permit_number ? parseInt(String(vehicle.permit_number).trim(), 10) : null;
    let parkingType = vehicle.parking_type;
    
    // If parking_type is not explicitly set or is empty, auto-assign based on permit
    if (!parkingType || !parkingType.trim()) {
      if (!vehicle.permit_number || !vehicle.permit_number.trim()) {
        // No permit = Red (unregistered)
        parkingType = 'Red';
      } else if (permitNum && !isNaN(permitNum)) {
        // Has permit: 602+ = Yellow, <602 = Green
        parkingType = permitNum >= 602 ? 'Yellow' : 'Green';
      } else {
        // Invalid permit number format = Red
        parkingType = 'Red';
      }
    }
    
    return {
      ...vehicle,
      parking_type: parkingType,
      is_active: vehicle.is_active !== undefined ? vehicle.is_active : true
    };
  });

  // Insert in chunks
  const chunkSize = 500;
  let insertedCount = 0;
  
  for (let i = 0; i < vehiclesWithAutoTypes.length; i += chunkSize) {
    const slice = vehiclesWithAutoTypes.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin
      .from(VEHICLE_TABLE)
      .insert(slice);
    
    if (error) throw error;
    insertedCount += slice.length;
  }

  return {
    deleted: 'all', // All previous vehicles were deleted
    inserted: insertedCount,
    total: insertedCount
  };
};

/**
 * Helper function to determine parking type from permit number
 * Permits >= 602 are Yellow, otherwise Green
 */
const getParkingTypeFromPermit = (permitNumber) => {
  if (!permitNumber) return 'Green';
  const permitStr = String(permitNumber).trim();
  if (!permitStr) return 'Green';
  const permitNum = parseInt(permitStr, 10);
  if (isNaN(permitNum)) return 'Green';
  return permitNum >= 602 ? 'Yellow' : 'Green';
};

/**
 * Update all vehicles' parking_type based on their permit numbers
 * Permits >= 602 (00602) will be set to Yellow, others to Green
 */
export const updateParkingTypesFromPermits = async () => {
  // Get all vehicles
  const { data: vehicles, error: fetchError } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .select('id, permit_number, parking_type');
  
  if (fetchError) throw fetchError;
  if (!vehicles || vehicles.length === 0) {
    return { updated: 0, total: 0 };
  }

  let updatedCount = 0;
  
  // Process in batches to avoid overwhelming the database
  const batchSize = 100;
  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize);
    
    // Prepare updates for vehicles that need their parking_type changed
    const updates = batch
      .map(vehicle => {
        const correctType = getParkingTypeFromPermit(vehicle.permit_number);
        // Only update if the parking_type needs to change
        if (vehicle.parking_type !== correctType) {
          return {
            id: vehicle.id,
            parking_type: correctType
          };
        }
        return null;
      })
      .filter(Boolean);

    // Update vehicles in this batch
    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from(VEHICLE_TABLE)
        .update({ parking_type: update.parking_type })
        .eq('id', update.id);
      
      if (error) throw error;
      updatedCount++;
    }
  }

  return { updated: updatedCount, total: vehicles.length };
};
