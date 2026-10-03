import 'next-auth';
import 'next-auth/jwt';

import type { CeruleaTokenSet } from '@/lib/auth';
import type { DivisionSubs } from '@/config/divisions';

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
      /** The single plan older screens read. "free" when no division holds a plan. */
      plan: string;
      /** The plan held in each division. */
      divisionSubs: DivisionSubs;
      /** True when Cerulea APIs names the account in its operator list. */
      isOperator: boolean;
      /** The same value under the name the administration frame reads. */
      isAdmin: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    /** The token pair Cerulea APIs issued, kept on the server. */
    cerulea?: CeruleaTokenSet;
    divisionSubs?: DivisionSubs;
    plan?: string;
    isOperator?: boolean;
  }
}
