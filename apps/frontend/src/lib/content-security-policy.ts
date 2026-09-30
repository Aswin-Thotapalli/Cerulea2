// apps/frontend/src/lib/content-security-policy.ts
// The content security policy Studio answers every screen with.
// Next.js writes small inline scripts into every page it renders. A policy of
// script-src 'self' refuses them, and the page then runs no client code, so the
// sign in form never submits. The middleware issues a fresh random nonce for
// every request, names it in the policy and hands it to Next.js, which writes
// the same nonce onto each inline script it renders. A script without the
// nonce stays refused.
// 'strict-dynamic' extends that trust to the scripts those inline scripts load.
// The development runtime evaluates code as it refreshes, so a development run
// alone adds 'unsafe-eval'. Every other directive stays as strict as the header
// set in apis/src/security/headers.ts.
// Without this module a strict policy stops every Studio screen.

/** The random value one request carries, in base64. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

export type PolicyInput = {
  nonce: string;
  /** A development run adds 'unsafe-eval' for the refreshing runtime. */
  development: boolean;
  /** Further origins the browser reaches for data, beside the page origin. */
  connectSources?: readonly string[];
  /**
   * Whether the page arrived over transport layer security. A page served over
   * plain HTTP on this machine carries no upgrade directive, since the browser
   * would move every redirect onto an HTTPS address nobody serves. An absent
   * value keeps the directive.
   */
  secureTransport?: boolean;
};

/** The directives of one policy line, in the order Cerulea writes them. */
export function policyDirectives(input: PolicyInput): [string, string[]][] {
  const scripts = ["'self'", `'nonce-${input.nonce}'`, "'strict-dynamic'"];
  if (input.development) scripts.push("'unsafe-eval'");
  return [
    ['default-src', ["'self'"]],
    ['script-src', scripts],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", ...(input.connectSources ?? [])]],
    ['frame-ancestors', ["'none'"]],
    ['frame-src', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ...(input.secureTransport === false
      ? []
      : ([['upgrade-insecure-requests', []]] as [string, string[]][])),
  ];
}

/** Writes the policy as the one header line a browser reads. */
export function contentSecurityPolicy(input: PolicyInput): string {
  return policyDirectives(input)
    .map(([name, values]) => (values.length === 0 ? name : `${name} ${values.join(' ')}`))
    .join('; ');
}
