import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  frontendOrigin: string;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number.parseInt(requireEnv('PORT'), 10);
if (Number.isNaN(port)) {
  throw new Error('PORT must be a valid number');
}

export const env: EnvConfig = {
  port,
  mongodbUri: requireEnv('MONGODB_URI'),
  jwtSecret: requireEnv('JWT_SECRET'),
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
};
