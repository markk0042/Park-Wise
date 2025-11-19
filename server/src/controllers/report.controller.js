import { supabaseAdmin } from '../config/supabase.js';

const countTable = async (table, filter) => {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

export const getDashboardSummary = async (_req, res, next) => {
  try {
    const [vehicleCount, activeVehicleCount, parkingLogCount, complaintCount] = await Promise.all([
      countTable('vehicles'),
      countTable('vehicles', (q) => q.eq('is_active', true)),
      countTable('parking_logs'),
      countTable('complaints'),
    ]);

    res.json({
      vehicles: vehicleCount,
      activeVehicles: activeVehicleCount,
      parkingLogs: parkingLogCount,
      complaints: complaintCount,
    });
  } catch (err) {
    next(err);
  }
};
