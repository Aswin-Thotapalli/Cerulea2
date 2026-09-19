import 'next-auth';
import 'next-auth/jwt';

import type { CeruleaTokenSet } from '@/lib/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      /** True while the access token Cerulea APIs issued still holds. */
      sessionOpen: boolean;
      /** The fix Cerulea named when the session ended. */
      signInFix?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    /** The token pair Cerulea APIs issued, kept on the server. */
    cerulea?: CeruleaTokenSet;
  }
}
