import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase() {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (err: unknown) {
    console.warn('MongoDB not available. API will return errors for DB operations.');
    console.warn('Start MongoDB and restart the server, or set MONGODB_URI in .env');
    if (err instanceof Error) {
      console.warn('Error:', err.message);
    }
    return false;
  }
}

export function getDatabaseStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export function closeDatabase() {
  return mongoose.connection.close();
}
