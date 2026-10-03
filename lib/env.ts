import { z } from "zod";

const sanitizeUrl = (val: unknown) => {
  if (typeof val !== "string" || !val.trim()) return val;
  let trimmed = val.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, "");
};

const envSchema = z.object({
  // Neon PostgreSQL Database
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/oris_emr"),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),

  // Better Auth & App
  BETTER_AUTH_SECRET: z.string().min(16).default("oris_secret_dev_fallback_at_least_32_characters_long"),
  BETTER_AUTH_URL: z.preprocess(sanitizeUrl, z.string().url()).default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.preprocess(sanitizeUrl, z.string().url()).default("http://localhost:3000"),

  // AWS S3 & CloudFront (Optional in early dev)
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_REGION: z.string().default("ap-southeast-1"),
  S3_BUCKET_NAME: z.string().optional().default(""),
  NEXT_PUBLIC_CLOUDFRONT_DOMAIN: z.string().optional().default(""),
  CLOUDFRONT_KEY_PAIR_ID: z.string().optional().default(""),
  CLOUDFRONT_PRIVATE_KEY: z.string().optional().default(""),

  // Mailcow / SMTP (Optional in dev, queued in DB)
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return val.toLowerCase() === "true" || val === "1";
      }
      return false;
    })
    .default(false),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM_EMAIL: z.string().email().default("noreply@orisemr.com"),
  SMTP_FROM_NAME: z.string().default("Oris EMR"),

  // Cron Secret
  CRON_SECRET: z.string().default("cron_secret_dev_fallback"),

  // Redis & Caching (Optional: defaults to in-memory TTL/LRU fallback)
  REDIS_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),

  // Database Connection Tuning
  DB_POOL_MAX: z.coerce.number().default(10),

  // Super Admin Initial Seed
  SEED_SUPER_ADMIN_NAME: z.string().default("Super Admin"),
  SEED_SUPER_ADMIN_EMAIL: z.string().email().default("admin@orisemr.com"),
  SEED_SUPER_ADMIN_PASSWORD: z.string().default("SuperAdmin123!"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  NEXT_PUBLIC_CLOUDFRONT_DOMAIN: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN,
  CLOUDFRONT_KEY_PAIR_ID: process.env.CLOUDFRONT_KEY_PAIR_ID,
  CLOUDFRONT_PRIVATE_KEY: process.env.CLOUDFRONT_PRIVATE_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "",
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  CRON_SECRET: process.env.CRON_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  DB_POOL_MAX: process.env.DB_POOL_MAX,
  SEED_SUPER_ADMIN_NAME: process.env.SEED_SUPER_ADMIN_NAME,
  SEED_SUPER_ADMIN_EMAIL: process.env.SEED_SUPER_ADMIN_EMAIL,
  SEED_SUPER_ADMIN_PASSWORD: process.env.SEED_SUPER_ADMIN_PASSWORD,
});
