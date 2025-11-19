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
app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
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
