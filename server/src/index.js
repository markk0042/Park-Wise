import './config/env.js';
import app from './app.js';
import { env } from './config/env.js';
import axios from 'axios';

const port = env.PORT;
const server = app.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
});

// Keep ANPR service awake (prevents Render free tier spin-down)
if (env.ANPR_SERVICE_URL && env.NODE_ENV === 'production') {
  const pingAnprService = async () => {
    try {
      await axios.get(`${env.ANPR_SERVICE_URL}/health`, {
        timeout: 5000
      });
      console.log('✅ ANPR service pinged - keeping awake');
    } catch (error) {
      // Service might be spinning up, that's ok - don't log as error
      if (error.code !== 'ECONNREFUSED') {
        console.log('⚠️ ANPR service ping failed (might be spinning up)');
      }
    }
  };

  // Ping every 10 minutes to keep service awake
  setInterval(pingAnprService, 10 * 60 * 1000);

  // Ping immediately on startup (after 5 seconds)
  setTimeout(pingAnprService, 5000);

  console.log('🔄 ANPR keep-alive ping enabled (every 10 minutes)');
}

process.on('SIGINT', () => {
  console.log('Shutting down gracefully (SIGINT)');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully (SIGTERM)');
  server.close(() => process.exit(0));
});
