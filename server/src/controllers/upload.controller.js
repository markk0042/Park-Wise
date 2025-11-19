import crypto from 'crypto';
import createError from 'http-errors';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

export const uploadEvidence = async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError(400, 'File is required');
    }

    const extension = req.file.originalname.split('.').pop();
    const filename = `${req.user.id}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(data.path);

    res.status(201).json({ file_url: urlData.publicUrl });
  } catch (err) {
    next(err);
  }
};
