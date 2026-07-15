import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

interface EnvConfig {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  frontendOrigin: string;
  geminiApiKeys: string[];
}

export function readNumberedGeminiApiKeys(source: NodeJS.ProcessEnv = process.env) {
  const numberedKeys = Object.entries(source)
    .map(([name, value]) => {
      const match = /^GEMINI_(\d+)_KEY$/.exec(name);
      return match && value?.trim()
        ? { order: Number.parseInt(match[1], 10), value: value.trim() }
        : null;
    })
    .filter((entry): entry is { order: number; value: string } => entry !== null)
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.value);

  return [...new Set(numberedKeys)];
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
  frontendOrigin: requireEnv('FRONTEND_ORIGIN'),
  geminiApiKeys: readNumberedGeminiApiKeys(),
};
