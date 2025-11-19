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
