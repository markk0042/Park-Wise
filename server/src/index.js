import './config/env.js';
import app from './app.js';
import { env } from './config/env.js';

const port = env.PORT;
const server = app.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully (SIGINT)');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully (SIGTERM)');
  server.close(() => process.exit(0));
});
