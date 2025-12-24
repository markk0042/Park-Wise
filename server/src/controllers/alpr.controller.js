import { processALPRWithLookup, checkALPRServiceHealth } from '../services/alpr.service.js';

/**
 * Process an image through ALPR and lookup vehicles
 * POST /api/alpr/process
 */
export const processALPR = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required. Please provide a base64-encoded image.',
      });
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    const result = await processALPRWithLookup(base64Image);

    res.json(result);
  } catch (error) {
    console.error('ALPR processing error:', error);
    res.status(500).json({
      error: error.message || 'ALPR processing failed',
    });
  }
};

/**
 * Check ALPR service health
 * GET /api/alpr/health
 */
export const getALPRHealth = async (req, res, next) => {
  try {
    const isHealthy = await checkALPRServiceHealth();
    res.json({
      status: isHealthy ? 'ok' : 'unavailable',
      service_available: isHealthy,
    });
  } catch (error) {
    console.error('ALPR health check error:', error);
    res.status(500).json({
      status: 'error',
      service_available: false,
      error: error.message,
    });
  }
};

