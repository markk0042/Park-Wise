import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import pinoHttp from 'pino-http';
import createError from 'http-errors';
import { env } from './config/env.js';
import router from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());

// CORS configuration - handle both '*' and specific origins
const getCorsOrigin = () => {
  // Default allowed origins (always include these)
  const defaultOrigins = [
    'https://park-wise-two.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') {
    // If '*' or not set, use function to allow default origins + any in development
    return (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // In development, allow all origins
      if (env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // In production, check against allowed origins
      if (defaultOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log for debugging
        console.warn(`⚠️  CORS: Blocked origin: ${origin}`);
        callback(null, true); // Still allow for now, but log it
      }
    };
  }

  // Parse comma-separated origins and trim whitespace
  const configuredOrigins = env.CORS_ORIGIN
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  // Combine with default origins
  const allOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

  return (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    if (allOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS: Blocked origin: ${origin}. Allowed: ${allOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  };
};

app.use(cors({
  origin: getCorsOrigin(),
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Increase JSON body size limit so high‑resolution uploaded images (base64)
// don't get rejected before reaching the ANPR service.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'ParkingLog API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: 'See README.md for API documentation'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);

// Ignore favicon requests (browsers automatically request this)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // 204 No Content - browser will stop requesting
});

app.use((req, res, next) => {
  next(createError(404, `Route ${req.originalUrl} not found`));
});

app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      status,
    }
  });
});

export default app;
