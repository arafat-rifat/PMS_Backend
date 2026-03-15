import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

export const env = envSchema.parse(process.env);

if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith('replace_with_')) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is still a placeholder. Auth/register will fail.');
}
if (env.JWT_ACCESS_SECRET.startsWith('replace_with_')) {
  console.warn('WARNING: JWT_ACCESS_SECRET is still a placeholder. Replace for production security.');
}
if (env.JWT_REFRESH_SECRET.startsWith('replace_with_')) {
  console.warn('WARNING: JWT_REFRESH_SECRET is still a placeholder. Replace for production security.');
}
