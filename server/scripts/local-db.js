/**
 * Development-only MongoDB, for machines without a MongoDB installation.
 * Runs a real mongod (via mongodb-memory-server) on 127.0.0.1:27017 and
 * persists data in server/.mongo-data so it survives restarts.
 *
 *   npm run db      (keep this terminal open)
 */
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = Number(process.env.LOCAL_DB_PORT) || 27017;
const dbPath = path.resolve(__dirname, '../.mongo-data');

async function main() {
  fs.mkdirSync(dbPath, { recursive: true });
  const mongod = await MongoMemoryServer.create({
    instance: { port: PORT, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
  });

  console.log(`Local MongoDB running at ${mongod.getUri()}`);
  console.log(`Data directory: ${dbPath}`);
  console.log('Press Ctrl+C to stop.');

  const stop = async () => {
    await mongod.stop({ doCleanup: false }); // keep data on disk
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  if (String(err.message).includes('already in use')) {
    console.error(`Port ${PORT} is already in use — a MongoDB server is probably already running.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
