import { processANPRWithLookup, checkANPRServiceHealth } from '../services/anpr.service.js';

/**
 * Process an image through ANPR and lookup vehicles
 * POST /api/anpr/process
 */
export const processANPR = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image provided. Please send a base64 encoded image.'
      });
    }

    // Validate image format
    if (!image.startsWith('data:image/') && !image.match(/^[A-Za-z0-9+/=]+$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Expected base64 encoded image.'
      });
    }

    const result = await processANPRWithLookup(image);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('ANPR processing error:', error);
    next(error);
  }
};

/**
 * Check ANPR service health
 * GET /api/anpr/health
 */
export const getANPRHealth = async (req, res, next) => {
  try {
    const isHealthy = await checkANPRServiceHealth();

    res.json({
      status: isHealthy ? 'healthy' : 'unavailable',
      serviceAvailable: isHealthy
    });
  } catch (error) {
    console.error('ANPR health check error:', error);
    res.json({
      status: 'unavailable',
      serviceAvailable: false,
      error: error.message
    });
  }
};

