/**
 * Scheduled cleanup task for old images
 * This can be called by a cron job or scheduled task
 * 
 * To use with Render Cron Jobs:
 * 1. Go to Render Dashboard → Cron Jobs
 * 2. Create new cron job
 * 3. Schedule: 0 2 * * * (runs daily at 2 AM)
 * 4. Command: curl -X POST https://your-backend-url.onrender.com/api/uploads/cleanup
 * 
 * Or use an external cron service like:
 * - cron-job.org
 * - EasyCron
 * - GitHub Actions (if using GitHub)
 */

import { cleanupOldImages } from '../controllers/upload.controller.js';

/**
 * Run cleanup task
 * This is a wrapper that can be called by scheduled tasks
 */
export const runCleanup = async () => {
  try {
    // Create a mock request/response for the cleanup function
    const mockReq = {};
    const mockRes = {
      json: (data) => {
        console.log('Cleanup result:', data);
        return data;
      }
    };
    const mockNext = (err) => {
      if (err) {
        console.error('Cleanup error:', err);
        throw err;
      }
    };

    await cleanupOldImages(mockReq, mockRes, mockNext);
  } catch (error) {
    console.error('Failed to run cleanup:', error);
    throw error;
  }
};

