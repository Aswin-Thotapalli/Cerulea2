// apps/frontend/src/lib/operators.ts
// The Cerulea operator role.
// Every deployment carries this role. The role upgrades the platform, verifies
// the licence and reads platform health. The role reads no customer record.
// The administration screens open for this role alone.
// Without this module every account would reach the administration screens.

/** Reads the operator address list from the environment value that names it. */
export function operatorAddresses(
  source: Record<string, string | undefined> = process.env,
): string[] {
  const named = source.CERULEA_OPERATOR_EMAILS ?? source.NEXT_PUBLIC_CERULEA_OPERATOR_EMAILS ?? '';
  return named
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/** Reports whether one address holds the Cerulea operator role. */
export function holdsOperatorRole(
  email: string | null | undefined,
  source: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  return operatorAddresses(source).includes(email.trim().toLowerCase());
}

/** The sentence a person reads when the administration screens stay closed. */
export const OPERATOR_ROLE_FIX =
  'The administration screens open for the Cerulea operator role. Ask the Cerulea operator to add this address to the operator list, then sign in again.';
