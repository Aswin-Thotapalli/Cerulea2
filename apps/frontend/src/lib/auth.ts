// apps/frontend/src/lib/auth.ts
// Studio sign in, backed by the Cerulea APIs accounts and sessions routes.
// Studio holds no account table. Cerulea APIs issues the access token and the
// refresh token, and Studio carries both inside the browser session.
// Without this module nobody signs in and every Studio screen stays closed.

import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth/next';

import { CeruleaApiError, refreshSession, signIn } from '@/lib/cerulea-api';

/** The seconds left on an access token at which Studio rotates the pair. */
export const ROTATION_MARGIN_SECONDS = 60;

export type CeruleaTokenSet = {
  accountId: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  sessionId: string;
  /** The message to show when the session ended and Cerulea named the fix. */
  signInFix?: string;
};

/** Reports whether the access token needs rotation before the next call. */
export function needsRotation(accessExpiresAt: string, now: Date): boolean {
  const expiry = Date.parse(accessExpiresAt);
  if (Number.isNaN(expiry)) return true;
  return expiry - now.getTime() <= ROTATION_MARGIN_SECONDS * 1000;
}

/** Reports whether the refresh token itself has passed its window. */
export function refreshWindowClosed(refreshExpiresAt: string, now: Date): boolean {
  const expiry = Date.parse(refreshExpiresAt);
  if (Number.isNaN(expiry)) return true;
  return expiry <= now.getTime();
}

/**
 * Rotates the token pair when the access token is near its end.
 * The caller receives the same set back when rotation is unnecessary.
 */
export async function rotateWhenDue(
  token: CeruleaTokenSet,
  now: Date = new Date(),
): Promise<CeruleaTokenSet> {
  if (!needsRotation(token.accessExpiresAt, now)) return token;
  if (refreshWindowClosed(token.refreshExpiresAt, now)) {
    return {
      ...token,
      accessToken: '',
      signInFix: 'The session reached its end. Sign in again to continue.',
    };
  }
  try {
    const outcome = await refreshSession(token.refreshToken);
    return {
      accountId: outcome.account.accountId,
      email: outcome.account.email,
      displayName: outcome.account.displayName,
      accessToken: outcome.session.accessToken,
      refreshToken: outcome.session.refreshToken,
      accessExpiresAt: outcome.session.expiresAt,
      refreshExpiresAt: outcome.session.refreshExpiresAt,
      sessionId: outcome.session.sessionId,
    };
  } catch (cause) {
    return {
      ...token,
      accessToken: '',
      signInFix:
        cause instanceof CeruleaApiError
          ? cause.fix
          : 'Sign in again to open a new session.',
    };
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
  },

  // The secure flag follows the address Studio is served on. A production build
  // served over plain HTTP still carries its cookie.
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_URL?.startsWith('https://')
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
        ...(process.env.AUTH_COOKIE_DOMAIN
          ? { domain: process.env.AUTH_COOKIE_DOMAIN }
          : {}),
      },
    },
  },

  providers: [
    CredentialsProvider({
      name: 'Cerulea account',
      credentials: {
        email: { label: 'Email address', type: 'email' },
        password: { label: 'Password', type: 'password' },
        multiFactorCode: { label: 'Authenticator code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.multiFactorCode) {
          throw new Error(
            'Cerulea needs the address, the password and the six digit code. Fill all three and sign in again.',
          );
        }
        try {
          const outcome = await signIn({
            email: credentials.email.trim().toLowerCase(),
            password: credentials.password,
            multiFactorCode: credentials.multiFactorCode.trim(),
          });
          return {
            id: outcome.account.accountId,
            email: outcome.account.email,
            name: outcome.account.displayName,
            image: null,
            cerulea: {
              accountId: outcome.account.accountId,
              email: outcome.account.email,
              displayName: outcome.account.displayName,
              accessToken: outcome.session.accessToken,
              refreshToken: outcome.session.refreshToken,
              accessExpiresAt: outcome.session.expiresAt,
              refreshExpiresAt: outcome.session.refreshExpiresAt,
              sessionId: outcome.session.sessionId,
            } satisfies CeruleaTokenSet,
          } as unknown as { id: string };
        } catch (cause) {
          if (cause instanceof CeruleaApiError) {
            throw new Error(cause.message);
          }
          throw cause;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      const carrier = token as JWT & { cerulea?: CeruleaTokenSet };
      if (user) {
        const supplied = (user as unknown as { cerulea?: CeruleaTokenSet }).cerulea;
        if (supplied) {
          carrier.cerulea = supplied;
          carrier.userId = supplied.accountId;
        }
        return carrier;
      }
      if (carrier.cerulea) {
        carrier.cerulea = await rotateWhenDue(carrier.cerulea);
        carrier.userId = carrier.cerulea.accountId;
      }
      return carrier;
    },
    async session({ session, token }) {
      const carrier = token as JWT & { cerulea?: CeruleaTokenSet };
      if (session.user && carrier.cerulea) {
        session.user.id = carrier.cerulea.accountId;
        session.user.email = carrier.cerulea.email;
        session.user.name = carrier.cerulea.displayName;
        session.user.sessionOpen = carrier.cerulea.accessToken.length > 0;
        session.user.signInFix = carrier.cerulea.signInFix;
      }
      return session;
    },
  },
};

/** Reads the browser session on the server. */
export function getSession() {
  return getServerSession(authOptions);
}
