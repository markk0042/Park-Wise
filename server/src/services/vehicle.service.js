import { supabaseAdmin } from '../config/supabase.js';

const VEHICLE_TABLE = 'vehicles';

export const listVehicles = async ({ orderBy = 'permit_number', ascending = true } = {}) => {
  const { data, error } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .select('*')
    .order(orderBy, { ascending });

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
  const { error } = await supabaseAdmin
    .from(VEHICLE_TABLE)
    .delete()
    .neq('id', '');

  if (error) throw error;
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
