import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { User } from './models/User.js';

dotenv.config();

// Use the same DNS servers as the existing Farmer Dost backend.
dns.setServers(['8.8.8.8', '8.8.4.4']);

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('MongoDB connected successfully.');

  const indexes = await User.collection.indexes();

  console.log('\n--- USER COLLECTION INDEXES ---');
  console.log(JSON.stringify(indexes, null, 2));
} catch (error) {
  console.error('ERROR:', error.message);
} finally {
  await mongoose.disconnect().catch(() => {});
}