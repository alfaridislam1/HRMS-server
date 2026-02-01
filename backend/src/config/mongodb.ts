import mongoose from 'mongoose';
import { config } from './env';
import { logger } from './logger';

let mongoConnection: typeof mongoose | null = null;

export const initializeMongoDB = async (): Promise<typeof mongoose> => {
  try {
    mongoConnection = await mongoose.connect(config.database.mongodb.url, {
      retryWrites: true,
      w: 'majority',
    });
    logger.info('MongoDB connected successfully');
    return mongoConnection;
  } catch (err) {
    logger.error('Failed to connect to MongoDB:', err);
    throw err;
  }
};

export const getMongoDB = (): typeof mongoose => {
  if (!mongoConnection) {
    throw new Error('MongoDB not initialized. Call initializeMongoDB() first.');
  }
  return mongoConnection;
};

export const closeMongoDB = async (): Promise<void> => {
  if (mongoConnection) {
    await mongoConnection.disconnect();
    logger.info('MongoDB connection closed');
  }
};
