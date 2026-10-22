import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const users = mongoose.connection.collection('users');
  const indexes = await users.indexes();
  const mobileIndex = indexes.find(index => index.name === 'mobile_1');

  if (!mobileIndex) {
    throw new Error('mobile_1 index not found. No changes made.');
  }

  if (mobileIndex.unique && mobileIndex.sparse) {
    console.log('Mobile index is already configured correctly.');
  } else {
    await users.dropIndex('mobile_1');

    try {
      await users.createIndex(
        { mobile: 1 },
        { unique: true, sparse: true, name: 'mobile_1' }
      );
      console.log('Mobile index updated successfully.');
    } catch (error) {
      console.error('Could not recreate mobile index:', error.message);
      console.error('Check the indexes before retrying.');
      throw error;
    }
  }

  console.log('\n--- UPDATED INDEXES ---');
  console.log(JSON.stringify(await users.indexes(), null, 2));
} catch (error) {
  console.error('MIGRATION ERROR:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
