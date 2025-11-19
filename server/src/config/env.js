import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Anon key is required'),
  SUPABASE_STORAGE_BUCKET: z.string().default('complaint-evidence'),
  CORS_ORIGIN: z.string().default('*'),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  CLEANUP_SECRET_TOKEN: z.string().optional() // Secret token for cleanup endpoint (for cron jobs)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
