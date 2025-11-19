import { supabaseAdmin } from '../config/supabase.js';

const PARKING_LOG_TABLE = 'parking_logs';

export const listParkingLogs = async ({ limit = 200, orderBy = 'created_at', ascending = false }) => {
  const { data, error } = await supabaseAdmin
    .from(PARKING_LOG_TABLE)
    .select('*')
    .order(orderBy, { ascending })
    .limit(limit);

  if (error) throw error;
  return data;
};

export const createParkingLog = async (payload) => {
  const { data, error } = await supabaseAdmin
    .from(PARKING_LOG_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteParkingLog = async (id) => {
  const { error } = await supabaseAdmin
    .from(PARKING_LOG_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
};
