import { z } from 'zod';
import {
  listComplaints,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  bulkDeleteComplaints
} from '../services/complaint.service.js';

const complaintSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image_url: z.string().url(),
  related_plate: z.string().optional().nullable(),
  location: z.string().min(1),
  status: z.enum(['new', 'in_progress', 'resolved']).default('new'),
  reported_date: z.string().optional(),
  reported_time: z.string().optional(),
});

export const getComplaints = async (_req, res, next) => {
  try {
    const complaints = await listComplaints({});
    res.json({ complaints });
  } catch (err) {
    next(err);
  }
};

export const postComplaint = async (req, res, next) => {
  try {
    const payload = complaintSchema.parse(req.body);
    const complaint = await createComplaint({
      ...payload,
      reported_date: payload.reported_date ?? new Date().toISOString().slice(0, 10),
      reported_time: payload.reported_time ?? new Date().toISOString().slice(11, 16),
      created_by: req.user.email
    });
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
};

export const patchComplaint = async (req, res, next) => {
  try {
    const payload = complaintSchema.partial().parse(req.body);
    const complaint = await updateComplaint(req.params.id, payload);
    res.json({ complaint });
  } catch (err) {
    next(err);
  }
};

export const removeComplaint = async (req, res, next) => {
  try {
    await deleteComplaint(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const bulkRemoveComplaints = async (req, res, next) => {
  try {
    const schema = z.object({ ids: z.array(z.string().uuid()).min(1) });
    const { ids } = schema.parse(req.body);
    await bulkDeleteComplaints(ids);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
