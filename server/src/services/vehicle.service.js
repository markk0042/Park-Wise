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
