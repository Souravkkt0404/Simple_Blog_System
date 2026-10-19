const http = require('http');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');
const { initSocket } = require('./socket');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);

  server.listen(config.port, () => {
    logger.info(`API listening on ${config.serverUrl} (${config.env})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    io.close();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
