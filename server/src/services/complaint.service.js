import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

const COMPLAINT_TABLE = 'complaints';

/**
 * Extract file path from various URL formats
 */
const extractFilePath = (url) => {
  if (!url) return null;
  
  // If it's already a path (no http/https), return as-is
  if (!url.startsWith('http')) {
    return url;
  }
  
  // Extract path from Supabase storage URLs
  // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  // or: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?...
  const storageMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    const path = decodeURIComponent(storageMatch[2]);
    return path;
  }
  
  // Try to extract from any URL ending with .jpg, .jpeg, .png, etc.
  // This handles cases where the URL might be malformed
  const fileMatch = url.match(/\/([^\/]+\.(jpg|jpeg|png|gif|webp))(?:\?|$)/i);
  if (fileMatch) {
    // If it's just a filename without user ID, we can't reconstruct the full path
    // Return null so we know we can't regenerate
    console.warn('Cannot extract full path from URL (missing user ID):', url);
    return null;
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
  const filePath = extractFilePath(imageUrl);
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
