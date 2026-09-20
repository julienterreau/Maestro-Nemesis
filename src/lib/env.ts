import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { adminEmailSchema, adminPasswordSchema } from "@/lib/validations";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
}

function isLocalAppUrl(value?: string) {
  if (!value) return true;
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

if (process.env.VERCEL) {
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) {
    const publicUrl = `https://${vercelHost.replace(/^https?:\/\//, "")}`;
    if (isLocalAppUrl(process.env.BETTER_AUTH_URL)) {
      process.env.BETTER_AUTH_URL = publicUrl;
    }
    if (isLocalAppUrl(process.env.NEXT_PUBLIC_APP_URL)) {
      process.env.NEXT_PUBLIC_APP_URL = publicUrl;
    }
  }
}

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(16),
    BETTER_AUTH_URL: z.string().url().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_SITE_URL: z.string().optional(),
    OPENROUTER_SITE_NAME: z.string().optional(),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    ADMIN_EMAIL: adminEmailSchema,
    ADMIN_PASSWORD: adminPasswordSchema,
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
});
