import { supabaseAdmin } from '../config/supabase.js';

const PARKING_LOG_TABLE = 'parking_logs';

export const listParkingLogs = async ({ limit = 1000, orderBy = 'created_at', ascending = false, startDate, endDate }) => {
  let query = supabaseAdmin
    .from(PARKING_LOG_TABLE)
    .select('*');
  
  // Add date filtering if provided
  if (startDate) {
    query = query.gte('log_date', startDate);
  }
  if (endDate) {
    query = query.lte('log_date', endDate);
  }
  
  // Apply ordering and limit
  query = query
    .order(orderBy, { ascending })
    .limit(limit);

  const { data, error } = await query;

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
