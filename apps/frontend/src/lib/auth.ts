// apps/frontend/src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import { db } from "@/db/client";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs"; // pure-JS — no native bindings, works on Vercel serverless
import { rateLimit } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
  },

  // Use HTTPS-based check (not NODE_ENV) so a production build running on HTTP
  // (e.g. `next start` locally) still sends cookies — Secure cookies are rejected
  // over plain HTTP regardless of NODE_ENV.
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_URL?.startsWith('https://')
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
        ...(process.env.AUTH_COOKIE_DOMAIN
          ? { domain: process.env.AUTH_COOKIE_DOMAIN }
          : {}),
      },
    },
  },

  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          // Rate limit login attempts per email (10 per minute)
          const rl = rateLimit(`login:${credentials.email.toLowerCase()}`, 10, 60_000);
          if (!rl.ok) {
            console.warn('[auth] login rate limit exceeded for', credentials.email);
            return null;
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email.toLowerCase().trim()));

          if (!user?.hashedPassword) {
            console.log('[auth] authorize: no user found for', credentials.email);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
          if (!valid) {
            console.log('[auth] authorize: wrong password for', credentials.email);
            return null;
          }

          // Fetch subscription plan to embed in token
          const [sub] = await db
            .select({ plan: subscriptions.plan, status: subscriptions.status })
            .from(subscriptions)
            .where(eq(subscriptions.userId, user.id))
            .limit(1);

          const isTest = String(user.isTestAccount) === 'true';
          const plan = isTest ? "pro" : (sub?.status === "active" ? sub.plan : "free");

          console.log('[auth] authorize: success for', credentials.email, '| plan:', plan, '| isTest:', isTest);
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            image: null,
            plan,
            isTestAccount: isTest,
          };
        } catch (err) {
          console.error('[auth] authorize threw:', err);
          throw err; // re-throw so NextAuth surfaces the real error string
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = (user as any).id;
        token.plan = (user as any).plan ?? "free";
        token.isTestAccount = (user as any).isTestAccount ?? false;
      }

      // Re-fetch plan from DB when session is explicitly refreshed (after subscription checkout)
      if (trigger === 'update' && token.userId) {
        try {
          const [sub] = await db
            .select({ plan: subscriptions.plan, status: subscriptions.status })
            .from(subscriptions)
            .where(eq(subscriptions.userId, token.userId as string))
            .limit(1);
          const isTest = token.isTestAccount as boolean;
          token.plan = isTest ? "pro" : (sub?.status === 'active' ? sub.plan : 'free');
        } catch { /* non-fatal — keep existing plan */ }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).plan = token.plan as string;
        (session.user as any).isTestAccount = token.isTestAccount as boolean;
      }
      return session;
    },
  },
};

// Typed helper so we don't repeat authOptions everywhere
export function getSession() {
  return getServerSession(authOptions);
}
