import crypto from 'crypto';
import createError from 'http-errors';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

export const uploadEvidence = async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError(400, 'File is required');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw createError(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      throw createError(400, 'File size exceeds 10MB limit');
    }

    const extension = req.file.originalname.split('.').pop();
    const filename = `${req.user.id}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw createError(500, `Failed to upload file: ${error.message || 'Unknown error'}`);
    }

    if (!data || !data.path) {
      throw createError(500, 'Upload succeeded but no file path returned');
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(data.path);

    if (!urlData || !urlData.publicUrl) {
      throw createError(500, 'Failed to generate public URL for uploaded file');
    }

    res.status(201).json({ file_url: urlData.publicUrl });
  } catch (err) {
    console.error('Upload evidence error:', err);
    next(err);
  }
};
