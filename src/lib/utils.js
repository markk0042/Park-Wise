import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Get the full image URL, handling both absolute URLs and relative proxy URLs
 */
export function getImageUrl(url) {
  if (!url) return null;
  
  // If it's already a full URL (http/https), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative URL (proxy endpoint), prepend API base URL
  if (url.startsWith('/api/')) {
    const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
    return `${API_BASE_URL}${url}`;
  }
  
  // If it's just a filename (no slashes, no protocol), it's likely a broken URL
  // Return null so the image error handler can show a fallback
  if (!url.includes('/') && !url.includes(':')) {
    console.warn('Invalid image URL format (filename only):', url);
    return null; // Return null to trigger error handling
  }
  
  // Return as-is if it's something else
  return url;
} 