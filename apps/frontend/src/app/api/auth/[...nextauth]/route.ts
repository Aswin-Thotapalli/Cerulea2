import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

// import your providers here
// import CredentialsProvider from "next-auth/providers/credentials";
// etc...

export const authOptions: NextAuthOptions = {
  // providers: [ ... ],
  // session: { strategy: "jwt" },
  // callbacks: { ... },
  // pages: { signIn: "/auth/login" },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
