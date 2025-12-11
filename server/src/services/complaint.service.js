import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

const COMPLAINT_TABLE = 'complaints';

/**
 * Search for a file in storage by filename
 * This searches through user folders to find files that match the filename
 */
const findFileByFilename = async (filename) => {
  try {
    // List folders in the bucket (user IDs)
    const { data: folders, error: listError } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing storage folders:', listError);
      return null;
    }

    if (!folders || folders.length === 0) {
      return null;
    }

    // Search through folders (user IDs) - limit to first 100 folders for performance
    // Process in parallel for better performance
    const searchPromises = folders
      .filter(folder => !folder.id) // Only check folders, not files
      .slice(0, 100) // Limit to first 100 folders
      .map(async (folder) => {
        try {
          const { data: files, error: filesError } = await supabaseAdmin.storage
            .from(env.SUPABASE_STORAGE_BUCKET)
            .list(folder.name, {
              limit: 1000
            });

          if (filesError) return null;

          // Check if any file matches the filename
          const matchingFile = files?.find(file => file.name === filename);
          if (matchingFile) {
            return `${folder.name}/${filename}`;
          }
        } catch (err) {
          // Skip errors for individual folders
        }
        return null;
      });

    const results = await Promise.all(searchPromises);
    const foundPath = results.find(path => path !== null);
    
    return foundPath || null;
  } catch (error) {
    console.error('Error searching for file:', error);
    return null;
  }
};

/**
 * Extract file path from various URL formats
 */
const extractFilePath = async (url) => {
  if (!url) return null;
  
  // If it's already a path (no http/https), check if it's a full path or just filename
  if (!url.startsWith('http')) {
    // If it contains a slash, it's likely a full path (userId/filename)
    if (url.includes('/')) {
      return url;
    }
    // If it's just a filename, search for it
    console.log('Searching for file by filename:', url);
    const foundPath = await findFileByFilename(url);
    return foundPath;
  }
  
  // Extract path from Supabase storage URLs
  // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  // or: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?...
  const storageMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    const path = decodeURIComponent(storageMatch[2]);
    return path;
  }
  
  // Try to extract filename from any URL ending with .jpg, .jpeg, .png, etc.
  const fileMatch = url.match(/\/([^\/]+\.(jpg|jpeg|png|gif|webp))(?:\?|$)/i);
  if (fileMatch) {
    const filename = fileMatch[1];
    // If it looks like just a filename (UUID format), search for it
    if (filename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$/i)) {
      console.log('Detected UUID filename, searching for file:', filename);
      const foundPath = await findFileByFilename(filename);
      return foundPath;
    }
  }
  
  return null;
};

/**
 * Regenerate signed URL for an image
 */
const regenerateImageUrl = async (imageUrl) => {
  if (!imageUrl) return imageUrl;
  
  // If it's already a valid signed URL (contains 'token='), regenerate it to ensure it's fresh
  if (imageUrl.includes('token=')) {
    // Extract path from signed URL
    const pathMatch = imageUrl.match(/\/storage\/v1\/object\/sign\/[^\/]+\/(.+?)(?:\?|$)/);
    if (pathMatch) {
      try {
        const filePath = decodeURIComponent(pathMatch[1]);
        const { data: signedData, error } = await supabaseAdmin.storage
          .from(env.SUPABASE_STORAGE_BUCKET)
          .createSignedUrl(filePath, 31536000);
        
        if (error) {
          console.error('Error creating signed URL for path:', filePath, error);
          return imageUrl; // Return original on error
        }
        
        if (signedData?.signedUrl) {
          return signedData.signedUrl;
        }
      } catch (error) {
        console.error('Exception regenerating signed URL:', error);
        return imageUrl;
      }
    }
  }
  
  // Try to extract path and generate new signed URL
  const filePath = await extractFilePath(imageUrl);
  if (filePath) {
    try {
      const { data: signedData, error } = await supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .createSignedUrl(filePath, 31536000);
      
      if (error) {
        console.error('Error creating signed URL for extracted path:', filePath, error);
        return imageUrl; // Return original on error
      }
      
      if (signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    } catch (error) {
      console.error('Exception regenerating signed URL for path:', filePath, error);
    }
  } else {
    console.warn('Could not extract file path from URL:', imageUrl);
  }
  
  // If we can't regenerate, return original URL
  return imageUrl;
};

export const listComplaints = async ({ orderBy = 'created_at', ascending = false }) => {
  const { data, error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .select('*')
    .order(orderBy, { ascending });

  if (error) throw error;
  
  // Regenerate signed URLs for all images
  if (data && Array.isArray(data)) {
    const complaintsWithRegeneratedUrls = await Promise.all(
      data.map(async (complaint) => {
        if (complaint.image_url) {
          const newUrl = await regenerateImageUrl(complaint.image_url);
          return { ...complaint, image_url: newUrl };
        }
        return complaint;
      })
    );
    return complaintsWithRegeneratedUrls;
  }
  
  return data;
};

export const createComplaint = async (payload) => {
  const { data, error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const updateComplaint = async (id, payload) => {
  const { data, error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteComplaint = async (id) => {
  const { error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const bulkDeleteComplaints = async (ids) => {
  const { error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .delete()
    .in('id', ids);

  if (error) throw error;
};
