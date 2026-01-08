// apps/frontend/src/lib/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },

  // Nice URLs
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
    verifyRequest: "/auth/login",
  },

  // Cross-subdomain cookie (prod). In dev you can omit AUTH_COOKIE_DOMAIN.
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      },
    },
  },

  providers: [
    // Email/password login
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const [user] = await db.select().from(users).where(eq(users.email, creds.email.toLowerCase()));
        if (!user?.hashedPassword) return null;
        const ok = await bcrypt.compare(creds.password, user.hashedPassword);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name || null, image: user.image || null };
      }
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.userId) (session as any).user.id = token.userId as string;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
