import 'dotenv/config';
import { readConfig } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { User } from './models/User.js';

let server;
try {
  const config = readConfig();
  await connectDatabase(config.MONGODB_URI);
  await User.init();
  const app = createApp(config);
  server = app.listen(config.PORT, () => console.log(`Farmer Dost API listening on port ${config.PORT}`));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function shutdown(signal) {
  console.log(`${signal} received; closing API server`);
  if (server) await new Promise((resolve) => server.close(resolve));
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect();
}
process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));
