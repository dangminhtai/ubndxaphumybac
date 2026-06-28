import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
}

export const env: EnvConfig = {
  port: parseInt(process.env.PORT || '5002', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/report_system',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
};
