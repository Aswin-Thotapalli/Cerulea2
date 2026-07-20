// Validates required server-side environment variables at startup.
// Imported as a side-effect in db/client.ts so every API route is covered.
// Skip during Next.js static build phase to avoid false-positive failures.

import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  NEXTAUTH_URL: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

if (
  typeof window === 'undefined' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => String(i.path[0] ?? i.message))
      .join(', ');
    const msg = `[env] Missing or invalid environment variables: ${missing}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }
}
