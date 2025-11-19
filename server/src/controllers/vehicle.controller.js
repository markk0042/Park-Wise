import { z } from 'zod';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  deleteAllVehicles,
  bulkInsertVehicles,
  updateParkingTypesFromPermits
} from '../services/vehicle.service.js';

const vehicleSchema = z.object({
  registration_plate: z.string().min(1),
  permit_number: z.string().optional().or(z.literal('')).transform((val) => val || null),
  parking_type: z.enum(['Green', 'Yellow', 'Red']).default('Green'),
  notes: z.string().optional().default(''),
  is_active: z.boolean().default(true)
});

export const getVehicles = async (req, res, next) => {
  try {
    const vehicles = await listVehicles({ orderBy: req.query.orderBy || 'permit_number' });
    res.json({ vehicles });
  } catch (err) {
    next(err);
  }
};

export const postVehicle = async (req, res, next) => {
  try {
    const payload = vehicleSchema.parse(req.body);
    const vehicle = await createVehicle(payload);
    res.status(201).json({ vehicle });
  } catch (err) {
    next(err);
  }
};

export const patchVehicle = async (req, res, next) => {
  try {
    const payload = vehicleSchema.partial().parse(req.body);
    const vehicle = await updateVehicle(req.params.id, payload);
    res.json({ vehicle });
  } catch (err) {
    next(err);
  }
};

export const removeVehicle = async (req, res, next) => {
  try {
    await deleteVehicle(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const removeAllVehicles = async (_req, res, next) => {
  try {
    await deleteAllVehicles();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const bulkUploadVehicles = async (req, res, next) => {
  try {
    const schema = z.array(vehicleSchema);
    const vehicles = schema.parse(req.body?.vehicles);
    await bulkInsertVehicles(vehicles);
    res.status(201).json({ inserted: vehicles.length });
  } catch (err) {
    next(err);
  }
};

export const updateAllParkingTypes = async (req, res, next) => {
  try {
    const result = await updateParkingTypesFromPermits();
    res.json({ 
      message: `Updated ${result.updated} of ${result.total} vehicles`,
      updated: result.updated,
      total: result.total
    });
  } catch (err) {
    next(err);
  }
};
