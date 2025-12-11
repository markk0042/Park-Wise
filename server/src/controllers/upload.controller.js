import crypto from 'crypto';
import createError from 'http-errors';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

/**
 * Recursively list all files in storage bucket
 */
const listAllFiles = async (path = '', allFiles = []) => {
  const { data: files, error } = await supabaseAdmin.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .list(path, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'asc' }
    });

  if (error) {
    throw error;
  }

  if (!files || files.length === 0) {
    return allFiles;
  }

  for (const file of files) {
    const fullPath = path ? `${path}/${file.name}` : file.name;
    
    // If it's a folder (no metadata means it's a folder), recurse
    if (!file.metadata && !file.id) {
      await listAllFiles(fullPath, allFiles);
    } else {
      // It's a file, add it with full path
      allFiles.push({
        ...file,
        fullPath: fullPath
      });
    }
  }

  return allFiles;
};

/**
 * Clean up old images from storage (older than 7 days)
 * This function deletes files that are older than the specified retention period
 */
/**
 * Serve images from storage bucket (proxy endpoint)
 * This allows serving images even if the bucket is private
 */
export const serveImage = async (req, res, next) => {
  try {
    const filePath = decodeURIComponent(req.params.path);
    
    if (!filePath) {
      throw createError(400, 'File path is required');
    }

    // Download the file from Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .download(filePath);

    if (error) {
      console.error('Error downloading file:', error);
      throw createError(404, 'File not found');
    }

    if (!data) {
      throw createError(404, 'File not found');
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type from file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const contentType = contentTypeMap[extension] || 'application/octet-stream';

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);
  } catch (err) {
    console.error('Serve image error:', err);
    next(err);
  }
};

export const cleanupOldImages = async (req, res, next) => {
  try {
    const retentionDays = 7; // Keep images for 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    console.log(`🧹 Starting cleanup: Deleting images older than ${cutoffDate.toISOString()}`);

    // List all files recursively
    const allFiles = await listAllFiles();

    if (!allFiles || allFiles.length === 0) {
      return res.json({ 
        message: 'No files to clean up',
        deleted: 0,
        total: 0
      });
    }

    // Filter files older than retention period
    const filesToDelete = [];
    const now = new Date();

    for (const file of allFiles) {
      // Check if file has created_at metadata
      if (file.created_at) {
        const fileDate = new Date(file.created_at);
        const ageInDays = (now - fileDate) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > retentionDays) {
          filesToDelete.push(file.fullPath || file.name);
        }
      } else if (file.updated_at) {
        // Fallback to updated_at if created_at is not available
        const fileDate = new Date(file.updated_at);
        const ageInDays = (now - fileDate) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > retentionDays) {
          filesToDelete.push(file.fullPath || file.name);
        }
      }
    }

    if (filesToDelete.length === 0) {
      return res.json({ 
        message: 'No files older than 7 days found',
        deleted: 0,
        total: allFiles.length
      });
    }

    // Delete old files in batches
    let deletedCount = 0;
    let errorCount = 0;
    const errors = [];
    const batchSize = 100; // Delete in batches to avoid overwhelming the API

    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);
      
      const { data: deletedFiles, error: deleteError } = await supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .remove(batch);

      if (deleteError) {
        console.error(`Error deleting batch:`, deleteError);
        errorCount += batch.length;
        errors.push({ batch: batch.length, error: deleteError.message });
      } else {
        deletedCount += (deletedFiles?.length || batch.length);
      }
    }

    console.log(`✅ Cleanup complete: Deleted ${deletedCount} files, ${errorCount} errors`);

    res.json({
      message: `Cleanup completed: ${deletedCount} files deleted`,
      deleted: deletedCount,
      errors: errorCount,
      total: allFiles.length,
      cutoffDate: cutoffDate.toISOString(),
      errorsList: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    next(err);
  }
};

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

    // Generate signed URL (valid for 1 year) - works even if bucket is private
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(data.path, 31536000); // 1 year in seconds

    if (signedError || !signedData?.signedUrl) {
      // Fallback to public URL if signed URL fails
      const { data: urlData } = supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(data.path);
      
      if (urlData && urlData.publicUrl) {
        res.status(201).json({ file_url: urlData.publicUrl });
      } else {
        throw createError(500, `Failed to generate URL for uploaded file: ${signedError?.message || 'Unknown error'}`);
      }
    } else {
      res.status(201).json({ file_url: signedData.signedUrl });
    }
  } catch (err) {
    console.error('Upload evidence error:', err);
    next(err);
  }
};
