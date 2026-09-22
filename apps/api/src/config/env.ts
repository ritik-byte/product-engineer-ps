import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/caygnus_realtime'),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000)),
  HOST: z.string().default('0.0.0.0'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  WS_PATH: z.string().default('/ws'),
  USE_IN_MEMORY_DB: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Environment configuration error:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}
