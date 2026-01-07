import { z } from 'zod';
import {
  listParkingLogs,
  createParkingLog,
  deleteParkingLog
} from '../services/parkingLog.service.js';

const parkingLogSchema = z.object({
  registration_plate: z.string().min(1),
  parking_type: z.enum(['Green', 'Yellow', 'Red', 'Visitor']).default('Green'),
  notes: z.string().optional().default(''),
  log_date: z.string().optional(),
  log_time: z.string().optional()
});

export const getParkingLogs = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;
    const logs = await listParkingLogs({ limit, startDate, endDate });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

export const postParkingLog = async (req, res, next) => {
  try {
    const payload = parkingLogSchema.parse(req.body);
    const log = await createParkingLog({
      ...payload,
      log_date: payload.log_date ?? new Date().toISOString().slice(0, 10),
      log_time: payload.log_time ?? new Date().toISOString().slice(11, 16),
      created_by: req.user.id
    });
    res.status(201).json({ log });
  } catch (err) {
    next(err);
  }
};

export const removeParkingLog = async (req, res, next) => {
  try {
    await deleteParkingLog(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
