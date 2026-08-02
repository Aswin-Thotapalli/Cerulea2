// apps/frontend/src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import { db } from "@/db/client";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs"; // pure-JS — no native bindings, works on Vercel serverless
import { rateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import type { Division, DivisionSubs } from "@/config/divisions";

// Build the per-division active-subscription map for a user. A user may hold up
// to one active subscription per division (dapp / enterprise / govt).
//
// Resilient to the `division` column not existing yet (pre-cutover): if the
// column is missing, it falls back to legacy single-plan behavior treating the
// active sub as the dapp division. The admin/test account gets all divisions.
async function fetchDivisionSubs(userId: string, isTest: boolean): Promise<DivisionSubs> {
  if (isTest) return { dapp: "pro", enterprise: "pro", govt: "pro" };
  try {
    const rows = await db
      .select({ plan: subscriptions.plan, status: subscriptions.status, division: subscriptions.division })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    const map: DivisionSubs = {};
    for (const r of rows) {
      if (r.status === "active") map[r.division as Division] = r.plan;
    }
    return map;
  } catch {
    // `division` column not present yet — fall back to single-plan legacy read.
    try {
      const [sub] = await db
        .select({ plan: subscriptions.plan, status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);
      return sub?.status === "active" ? { dapp: sub.plan } : {};
    } catch {
      return {};
    }
  }
}

// Legacy single `plan` value derived from the division map, for backward compat
// with code that still reads token.plan / session.user.plan.
function derivePlan(subs: DivisionSubs, isTest: boolean): string {
  if (isTest) return "pro";
  return subs.dapp ?? subs.enterprise ?? subs.govt ?? "free";
}

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

          const isTest = String(user.isTestAccount) === 'true';

          // Fetch per-division subscription map to embed in the token.
          const divisionSubs = await fetchDivisionSubs(user.id, isTest);
          const plan = derivePlan(divisionSubs, isTest);

          console.log('[auth] authorize: success for', credentials.email, '| divisions:', JSON.stringify(divisionSubs), '| isTest:', isTest);
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            image: null,
            plan,
            divisionSubs,
            isTestAccount: isTest,
          } as any;
        } catch (err) {
          console.error('[auth] authorize threw:', err);
          throw err; // re-throw so NextAuth surfaces the real error string
        }
      },
    }),
  ],

  events: {
    async signIn({ user }) {
      logAudit({ userId: (user as any).id, actorEmail: user.email ?? undefined, action: 'auth.login', resource: 'user', resourceId: (user as any).id, status: 'success' });
    },
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = (user as any).id;
        token.plan = (user as any).plan ?? "free";
        token.divisionSubs = (user as any).divisionSubs ?? {};
        token.isTestAccount = (user as any).isTestAccount ?? false;
        const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        token.isAdmin = (user as any).isTestAccount === true || adminEmails.includes((user.email ?? '').toLowerCase());
      }

      // Re-fetch the division map from DB when the session is explicitly
      // refreshed (e.g. after a subscription checkout in any division).
      if (trigger === 'update' && token.userId) {
        try {
          const isTest = token.isTestAccount as boolean;
          const divisionSubs = await fetchDivisionSubs(token.userId as string, isTest);
          token.divisionSubs = divisionSubs;
          token.plan = derivePlan(divisionSubs, isTest);
        } catch { /* non-fatal — keep existing token values */ }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).plan = token.plan as string;
        (session.user as any).divisionSubs = (token.divisionSubs as DivisionSubs) ?? {};
        (session.user as any).isTestAccount = token.isTestAccount as boolean;
        (session.user as any).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};

// Typed helper so we don't repeat authOptions everywhere
export function getSession() {
  return getServerSession(authOptions);
}
